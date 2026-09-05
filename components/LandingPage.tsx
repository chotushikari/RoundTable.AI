'use client';

import { useState, useRef, Suspense, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import type { RTMClient } from 'agora-rtm';
import type {
  AgoraTokenData,
  ClientStartRequest,
  AgentResponse,
  AgoraRenewalTokens,
} from '../types/conversation';
import { ErrorBoundary } from './ErrorBoundary';
import { LoadingSkeleton } from './LoadingSkeleton';
import { QuickstartPreCallCard } from './QuickstartPreCallCard';

// Dynamically import the ConversationComponent with ssr disabled
const ConversationComponent = dynamic(() => import('./ConversationComponent'), {
  ssr: false,
});

// Dynamically import AgoraRTCProvider (browser-only).
// The AgoraVoiceAI toolkit is initialized inside ConversationComponent after
// the RTC join succeeds, so this wrapper only needs to provide the RTC client.
const AgoraProvider = dynamic(
  async () => {
    const { AgoraRTCProvider, default: AgoraRTC } =
      await import('agora-rtc-react');
    return {
      default: function AgoraProviders({
        children,
      }: {
        children: React.ReactNode;
      }) {
        // useRef persists across StrictMode's simulated unmount/remount, so only
        // one RTC client is ever created per session (useMemo creates two in StrictMode).
        const clientRef = useRef<ReturnType<
          typeof AgoraRTC.createClient
        > | null>(null);
        if (!clientRef.current) {
          clientRef.current = AgoraRTC.createClient({
            mode: 'rtc',
            codec: 'vp8',
          });
        }
        return (
          <AgoraRTCProvider client={clientRef.current}>
            {children}
          </AgoraRTCProvider>
        );
      },
    };
  },
  { ssr: false },
);

type InvitationPreview = {
  roleTitle: string;
  companyName: string;
  durationMinutes: number;
  panelRoles: string[];
  demoMode?: boolean;
  existingSession?: { id: string; status: string } | null;
};

export default function LandingPage({ invitationToken }: { invitationToken?: string }) {
  const [showConversation, setShowConversation] = useState(false);

  // Preload heavy modules on mount so they're already cached when the user
  // clicks "Try it Now" — eliminates the ~1.8s dynamic-import delay.
  useEffect(() => {
    import('agora-rtc-react').catch(() => {});
    import('agora-rtm').catch(() => {});
  }, []);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agoraData, setAgoraData] = useState<AgoraTokenData | null>(null);
  const [rtmClient, setRtmClient] = useState<RTMClient | null>(null);
  const [agentJoinError, setAgentJoinError] = useState(false);
  const [consent, setConsent] = useState(false);
  const [invitation, setInvitation] = useState<InvitationPreview | null>(null);
  const [completed, setCompleted] = useState(false);
  const [resumeText, setResumeText] = useState('');
  const [releasedFeedback, setReleasedFeedback] = useState<{ strengths: string[]; growthAreas: string[] } | null>(null);
  const [isInvitationLoading, setIsInvitationLoading] = useState(Boolean(invitationToken));
  const startInFlightRef = useRef(false);
  const endInFlightRef = useRef(false);

  useEffect(() => {
    if (!invitationToken) return;
    fetch(`/api/invitations/${encodeURIComponent(invitationToken)}`, { cache: 'no-store' })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? 'Invitation could not be loaded');
        setInvitation(data);
        if (data.existingSession?.status === 'completed') {
          setCompleted(true);
          void fetch(`/api/sessions/${data.existingSession.id}`)
            .then((result) => result.json())
            .then((result) => setReleasedFeedback(result.feedback ?? null));
        }
      })
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Invitation could not be loaded'))
      .finally(() => setIsInvitationLoading(false));
  }, [invitationToken]);

  const handleStartConversation = async () => {
    if (startInFlightRef.current) return;
    startInFlightRef.current = true;
    setIsLoading(true);
    setError(null);
    setAgentJoinError(false);

    try {
      if (invitationToken) {
        const resumeId = invitation?.existingSession && ['ready', 'starting', 'in_progress'].includes(invitation.existingSession.status)
          ? invitation.existingSession.id
          : null;
        const sessionResponse = await fetch(resumeId
          ? `/api/sessions/${resumeId}/resume`
          : `/api/invitations/${encodeURIComponent(invitationToken)}/session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: resumeId ? undefined : JSON.stringify({ consent, resumeText: resumeText || undefined }),
        });
        const responseData = await sessionResponse.json();
        if (!sessionResponse.ok) throw new Error(responseData.error ?? 'Failed to start interview');
        const agentStartPromise = responseData.agentId
          ? Promise.resolve({ ok: true, data: { agentId: responseData.agentId } })
          : fetch(`/api/sessions/${responseData.sessionId}/start`, { method: 'POST' })
            .then(async (response) => ({ ok: response.ok, data: await response.json() }));
        const { default: AgoraRTM } = await import('agora-rtm');
        const rtm: RTMClient = new AgoraRTM.RTM(
          process.env.NEXT_PUBLIC_AGORA_APP_ID!,
          responseData.rtcUid,
        );
        await rtm.login({ token: responseData.rtmToken });
        await rtm.subscribe(responseData.channel);
        setRtmClient(rtm);
        setAgoraData({ ...responseData, uid: responseData.rtcUid, token: responseData.rtcToken });
        setShowConversation(true);
        void agentStartPromise.then(({ ok, data }) => {
          if (!ok) {
            setAgentJoinError(true);
            setError(data.error ?? 'The AI interviewer could not join.');
            return;
          }
          if (data.agentId) {
            setAgoraData((current) => current ? { ...current, agentId: data.agentId } : current);
          }
        }).catch((startError) => {
          console.error('Failed to start interview agent:', startError);
          setAgentJoinError(true);
        });
        return;
      }
      // 1. Fetch RTC token + channel
      // console.log('Fetching Agora token...');
      const agoraResponse = await fetch('/api/generate-agora-token');
      const responseData = await agoraResponse.json();
      // console.log('Agora token response: uid =', responseData.uid, 'channel =', responseData.channel);

      if (!agoraResponse.ok) {
        throw new Error(
          `Failed to generate Agora token: ${JSON.stringify(responseData)}`,
        );
      }

      // 2. Run agent invite and RTM setup in parallel — both only need the token response.
      //    RTM must be ready before ConversationComponent mounts so AgoraVoiceAI
      //    can subscribe immediately. Agent invite is non-fatal.
      const [agentData, rtm] = await Promise.all([
        // 2a. Start the AI agent
        fetch('/api/invite-agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requester_id: responseData.uid,
            channel_name: responseData.channel,
          } as ClientStartRequest),
        })
          .then(async (res) => {
            if (!res.ok) {
              setAgentJoinError(true);
              return null;
            }
            return res.json() as Promise<AgentResponse>;
          })
          .catch((err) => {
            console.error('Failed to start conversation with agent:', err);
            setAgentJoinError(true);
            return null;
          }),

        // 2b. Set up RTM (dynamically imported to keep it client-only)
        (async () => {
          const { default: AgoraRTM } = await import('agora-rtm');
          const rtm: RTMClient = new AgoraRTM.RTM(
            process.env.NEXT_PUBLIC_AGORA_APP_ID!,
            responseData.uid,
          );
          await rtm.login({ token: responseData.token });
          await rtm.subscribe(responseData.channel);
          // console.log('RTM ready, channel:', responseData.channel);
          return rtm;
        })(),
      ]);

      // 3. All dependencies ready — store state and show conversation
      setRtmClient(rtm);
      setAgoraData({ ...responseData, agentId: agentData?.agent_id });
      setShowConversation(true);
    } catch (err) {
      setError('Failed to start conversation. Please try again.');
      console.error('Error starting conversation:', err);
    } finally {
      setIsLoading(false);
      startInFlightRef.current = false;
    }
  };

  const handleTokenWillExpire = useCallback(
    async (uid: string): Promise<AgoraRenewalTokens> => {
      try {
        const channel = agoraData?.channel;
        if (!channel) {
          throw new Error('Missing channel for token renewal');
        }

        // RTC and RTM tokens are renewed independently:
        //   - RTC uses the browser client's assigned UID (passed in from ConversationComponent).
        //   - RTM uses the same UID that was used during RTM login (agoraData.uid).
        // Both are fetched in parallel to stay within the token-expiry grace-period window.
        if (agoraData.sessionId) {
          const response = await fetch(`/api/sessions/${agoraData.sessionId}/renew`, { method: 'POST' });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error ?? 'Failed to renew session tokens');
          return { rtcToken: data.rtcToken, rtmToken: data.rtmToken };
        }
        const [rtcResponse, rtmResponse] = await Promise.all([
          fetch(`/api/generate-agora-token?channel=${channel}&uid=${uid}`),
          fetch(`/api/generate-agora-token?channel=${channel}&uid=${agoraData.uid}`),
        ]);
        const [rtcData, rtmData] = await Promise.all([
          rtcResponse.json(),
          rtmResponse.json(),
        ]);

        if (!rtcResponse.ok || !rtmResponse.ok) {
          throw new Error('Failed to generate renewal tokens');
        }

        return {
          rtcToken: rtcData.token,
          rtmToken: rtmData.token,
        };
      } catch (error) {
        console.error('Error renewing token:', error);
        throw error;
      }
    },
    [agoraData],
  );

  const handleEndConversation = async () => {
    if (endInFlightRef.current) return;
    endInFlightRef.current = true;
    if (agoraData?.sessionId) {
      try {
        await fetch(`/api/sessions/${agoraData.sessionId}/stop`, { method: 'POST' });
        await fetch(`/api/sessions/${agoraData.sessionId}/finalize`, { method: 'POST' });
        setCompleted(true);
      } catch (stopError) {
        console.error('Failed to finalize interview:', stopError);
      }
    }
    // Stop the AI agent
    if (agoraData?.agentId && !agoraData.sessionId) {
      try {
        // console.log('Stopping agent:', agoraData.agentId);
        const response = await fetch('/api/stop-conversation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agent_id: agoraData.agentId }),
        });
        if (!response.ok) {
          console.error('Failed to stop agent:', await response.text());
        }
        // else console.log('Agent stopped successfully');
      } catch (error) {
        console.error('Error stopping agent:', error);
      }
    }

    // Tear down RTM — owned here since we created it here
    rtmClient?.logout().catch((err) => console.error('RTM logout error:', err));
    setRtmClient(null);
    setShowConversation(false);
    endInFlightRef.current = false;
  };

  return (
    <div className="relative flex h-dvh min-h-screen flex-col overflow-hidden bg-background text-foreground">
      {/* Hero shell: either shows the pre-call CTA or swaps in the live conversation experience. */}
      <div
        className={`flex min-h-0 flex-1 flex-col ${
          showConversation
            ? 'items-stretch justify-start'
            : 'items-center justify-center'
        }`}
      >
        <div
          className={`z-10 flex min-h-0 flex-1 flex-col ${
            showConversation
              ? 'h-full w-full max-w-none items-stretch gap-0 px-0 text-left'
              : 'w-full max-w-none items-center justify-center px-4 text-center'
          }`}
        >
          {!showConversation ? (
            completed ? (
              <div className="max-w-lg rounded-2xl border border-border bg-card p-8 text-center">
                <h1 className="text-2xl font-semibold">Interview complete</h1>
                <p className="mt-3 text-sm text-muted-foreground">Your evidence is ready for human review. Feedback appears only if the company releases it.</p>
                {releasedFeedback && <div className="mt-6 text-left text-sm"><h2 className="font-semibold">Released summary</h2><p className="mt-2">Strengths: {releasedFeedback.strengths.join(' ') || 'No supported strength was released.'}</p><p className="mt-2">Growth areas: {releasedFeedback.growthAreas.join(' ') || 'No growth area was released.'}</p></div>}
              </div>
            ) : (
              <QuickstartPreCallCard
                isLoading={isLoading || isInvitationLoading}
                error={error}
                onStartConversation={handleStartConversation}
                interview={invitation}
                requiresConsent={Boolean(invitationToken)}
                consent={consent}
                onConsentChange={setConsent}
                onResumeTextChange={setResumeText}
              />
            )
          ) : agoraData && rtmClient ? (
            <>
              {/* Non-fatal invite warning: the browser session can still render even if agent start failed. */}
              {agentJoinError && (
                <div className="p-3 bg-destructive/10 rounded-md text-destructive text-sm max-w-sm">
                  Failed to connect with AI agent. The conversation may not work
                  as expected.
                </div>
              )}
              {/* Browser-only conversation mount: RTC provider, error boundary, and lazy-loaded call UI. */}
              <Suspense fallback={<LoadingSkeleton />}>
                <ErrorBoundary>
                  <AgoraProvider>
                    <ConversationComponent
                      agoraData={agoraData}
                      rtmClient={rtmClient}
                      onTokenWillExpire={handleTokenWillExpire}
                      onEndConversation={handleEndConversation}
                    />
                  </AgoraProvider>
                </ErrorBoundary>
              </Suspense>
            </>
          ) : (
            /* Fallback if session bootstrap partially succeeded but required state is missing. */
            <p className="text-sm text-muted-foreground">
              Failed to load conversation data.
            </p>
          )}
        </div>
      </div>

      {/* Persistent attribution footer for the pre-call and in-call views. */}
      <footer className="fixed bottom-0 right-0 z-40 py-4 pr-4 md:py-6 md:pr-6">
        <div className="flex items-center justify-end gap-2 text-muted-foreground">
          <span className="text-xs font-medium tracking-wide uppercase">
            {invitationToken ? 'AI interview panel · Powered by' : 'Powered by'}
          </span>
          <a
            href="https://agora.io/en/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary transition-colors"
            aria-label="Visit Agora's website"
          >
            <Image
              src="/agora-logo-rgb-blue.svg"
              alt="Agora"
              width={86}
              height={24}
              priority
              className="h-6 w-auto hover:opacity-80 transition-opacity translate-y-1"
            />
            <span className="sr-only">Agora</span>
          </a>
        </div>
      </footer>
    </div>
  );
}
