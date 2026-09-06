'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import { animate } from 'animejs';
import * as THREE from 'three';
import { ArrowDown, Mic, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import styles from './RoundTableExperience.module.css';

const VoiceDemo = dynamic(() => import('./LandingPage'), {
  ssr: false,
  loading: () => <div className={styles.demoLoading}>Preparing voice demo</div>,
});

const roles = [
  { label: 'Hiring Manager', className: styles.roleNorth },
  { label: 'Technical', className: styles.roleEast },
  { label: 'Product', className: styles.roleSouthEast },
  { label: 'Customer', className: styles.roleSouthWest },
  { label: 'Behavioural', className: styles.roleWest },
];

type SceneState = {
  setPointer: (x: number, y: number) => void;
  setHappy: (happy: boolean) => void;
  destroy: () => void;
};

function smoothstep(start: number, end: number, value: number) {
  const x = Math.max(0, Math.min(1, (value - start) / (end - start)));
  return x * x * (3 - 2 * x);
}

function createArtifact(canvas: HTMLCanvasElement, progressRef: MutableRefObject<number>): SceneState {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  camera.position.set(0, 0, 9.5);

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setClearColor(0x101010, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));

  const root = new THREE.Group();
  scene.add(root);

  const black = new THREE.MeshBasicMaterial({ color: 0x777777, wireframe: true, transparent: true });
  const green = new THREE.MeshBasicMaterial({ color: 0x3ecf8e, transparent: true, opacity: 0.12 });
  const lineMaterial = new THREE.LineBasicMaterial({ color: 0x555555, transparent: true, opacity: 0 });
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(1.12, 2), black);
  const coreGlow = new THREE.Mesh(new THREE.IcosahedronGeometry(0.93, 2), green);
  root.add(core, coreGlow);

  const ringA = new THREE.Mesh(
    new THREE.TorusGeometry(1.42, 0.012, 8, 96),
    new THREE.MeshBasicMaterial({ color: 0x666666, transparent: true, opacity: 0.45 }),
  );
  ringA.rotation.x = Math.PI / 2.7;
  root.add(ringA);

  const ringB = ringA.clone();
  ringB.rotation.set(Math.PI / 2, 0.6, 0.2);
  root.add(ringB);

  const orbitTargets = [
    new THREE.Vector3(0, 2.25, 0),
    new THREE.Vector3(2.25, 0.72, 0),
    new THREE.Vector3(1.45, -1.85, 0),
    new THREE.Vector3(-1.45, -1.85, 0),
    new THREE.Vector3(-2.25, 0.72, 0),
  ];
  const satellites = orbitTargets.map((_, index) => {
    const mesh = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.34, 1),
      new THREE.MeshBasicMaterial({
        color: index === 1 ? 0x3ecf8e : 0x777777,
        wireframe: true,
        transparent: true,
        opacity: 0,
      }),
    );
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(),
      new THREE.Vector3(),
    ]);
    const line = new THREE.Line(geometry, lineMaterial.clone());
    root.add(line, mesh);
    return { mesh, line };
  });

  const face = new THREE.Group();
  face.visible = false;
  root.add(face);
  const faceShell = new THREE.Mesh(
    new THREE.SphereGeometry(1.18, 48, 48),
    new THREE.MeshBasicMaterial({ color: 0x181818 }),
  );
  const faceOutline = new THREE.Mesh(
    new THREE.SphereGeometry(1.205, 32, 32),
    new THREE.MeshBasicMaterial({ color: 0x777777, wireframe: true, transparent: true, opacity: 0.42 }),
  );
  face.add(faceShell, faceOutline);

  const eyeWhiteMaterial = new THREE.MeshBasicMaterial({ color: 0xededed });
  const pupilMaterial = new THREE.MeshBasicMaterial({ color: 0x101010 });
  const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.21, 24, 24), eyeWhiteMaterial);
  const rightEye = leftEye.clone();
  leftEye.position.set(-0.42, 0.27, 1.02);
  rightEye.position.set(0.42, 0.27, 1.02);
  const leftPupil = new THREE.Mesh(new THREE.SphereGeometry(0.075, 18, 18), pupilMaterial);
  const rightPupil = leftPupil.clone();
  leftPupil.position.set(-0.42, 0.27, 1.21);
  rightPupil.position.set(0.42, 0.27, 1.21);
  const nose = new THREE.Mesh(
    new THREE.ConeGeometry(0.085, 0.25, 16),
    new THREE.MeshBasicMaterial({ color: 0x24b47e }),
  );
  nose.rotation.x = Math.PI / 2;
  nose.position.set(0, -0.02, 1.2);
  const mouthCurve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(-0.38, -0.42, 1.08),
    new THREE.Vector3(0, -0.58, 1.2),
    new THREE.Vector3(0.38, -0.42, 1.08),
  );
  const mouthGeometry = new THREE.TubeGeometry(mouthCurve, 24, 0.025, 8, false);
  const mouth = new THREE.Mesh(mouthGeometry, new THREE.MeshBasicMaterial({ color: 0xd4d4d4 }));
  face.add(leftEye, rightEye, leftPupil, rightPupil, nose, mouth);

  let pointerX = 0;
  let pointerY = 0;
  let happy = false;
  let frame = 0;
  let currentProgress = progressRef.current;

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    renderer.setSize(Math.max(1, rect.width), Math.max(1, rect.height), false);
    camera.aspect = Math.max(1, rect.width) / Math.max(1, rect.height);
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();

  const render = (time: number) => {
    currentProgress += (progressRef.current - currentProgress) * 0.075;
    const panel = smoothstep(0.16, 0.3, currentProgress) * (1 - smoothstep(0.56, 0.68, currentProgress));
    const faceAmount = smoothstep(0.59, 0.72, currentProgress) * (1 - smoothstep(0.88, 0.98, currentProgress));

    core.scale.setScalar(1 - panel * 0.56 + faceAmount * 0.08);
    core.rotation.x = time * 0.00012;
    core.rotation.y = time * 0.00018 + currentProgress * Math.PI * 1.25;
    core.visible = faceAmount < 0.52;
    coreGlow.visible = core.visible;
    ringA.visible = core.visible;
    ringB.visible = core.visible;
    const panelOffsetX = window.innerWidth > 900 ? panel * 2.55 : 0;
    const panelOffsetY = window.innerWidth > 900 ? panel * 1.28 : 0;
    root.position.x += (panelOffsetX - root.position.x) * 0.08;
    root.position.y += (panelOffsetY - root.position.y) * 0.08;
    ringA.scale.setScalar(1 + panel * 0.34);
    ringB.scale.copy(ringA.scale);
    ringA.rotation.z = time * 0.00011;
    ringB.rotation.z = -time * 0.00014;

    satellites.forEach(({ mesh, line }, index) => {
      const target = orbitTargets[index];
      mesh.position.copy(target).multiplyScalar(panel);
      mesh.scale.setScalar(0.25 + panel * 0.75);
      mesh.rotation.x = time * 0.0003 + index;
      mesh.rotation.y = time * 0.00022 + index * 0.4;
      (mesh.material as THREE.MeshBasicMaterial).opacity = panel * (1 - faceAmount);
      const positions = line.geometry.attributes.position as THREE.BufferAttribute;
      positions.setXYZ(0, 0, 0, 0);
      positions.setXYZ(1, mesh.position.x, mesh.position.y, mesh.position.z);
      positions.needsUpdate = true;
      (line.material as THREE.LineBasicMaterial).opacity = panel * 0.55 * (1 - faceAmount);
    });

    face.visible = faceAmount > 0.04;
    face.scale.setScalar(0.5 + faceAmount * 0.5);
    face.rotation.y += ((pointerX * 0.08) - face.rotation.y) * 0.08;
    face.rotation.x += ((-pointerY * 0.05) - face.rotation.x) * 0.08;
    const pupilDx = pointerX * 0.075;
    const pupilDy = pointerY * 0.055;
    leftPupil.position.set(-0.42 + pupilDx, 0.27 + pupilDy, 1.21);
    rightPupil.position.set(0.42 + pupilDx, 0.27 + pupilDy, 1.21);
    mouth.scale.y += (((happy ? -1 : 1)) - mouth.scale.y) * 0.12;
    mouth.position.y += (((happy ? -0.9 : 0)) - mouth.position.y) * 0.12;
    face.position.y = happy ? Math.sin(time * 0.006) * 0.05 : 0;

    root.scale.setScalar(1 - panel * 0.48);
    renderer.render(scene, camera);
    frame = requestAnimationFrame(render);
  };
  frame = requestAnimationFrame(render);

  return {
    setPointer(x, y) {
      pointerX = x;
      pointerY = y;
    },
    setHappy(value) {
      happy = value;
    },
    destroy() {
      cancelAnimationFrame(frame);
      observer.disconnect();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
          object.geometry.dispose();
          const material = object.material;
          if (Array.isArray(material)) material.forEach((item) => item.dispose());
          else material.dispose();
        }
      });
      renderer.dispose();
    },
  };
}

export function RoundTableExperience() {
  const trackRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const heroSceneRef = useRef<HTMLElement>(null);
  const panelSceneRef = useRef<HTMLElement>(null);
  const agoraSceneRef = useRef<HTMLElement>(null);
  const progressRef = useRef(0);
  const sceneRef = useRef<SceneState | null>(null);
  const companionButtonRef = useRef<HTMLButtonElement>(null);
  const [phase, setPhase] = useState<'hero' | 'panel' | 'agora'>('hero');
  const [companionHappy, setCompanionHappy] = useState(false);
  const [companionStartSignal, setCompanionStartSignal] = useState(0);

  useEffect(() => {
    if (!canvasRef.current) return;
    sceneRef.current = createArtifact(canvasRef.current, progressRef);
    return () => sceneRef.current?.destroy();
  }, []);

  useEffect(() => {
    let scrollRaf = 0;
    let animationRaf = 0;
    let current = 0;
    let currentPhase: typeof phase = 'hero';
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const showScene = (element: HTMLElement | null, opacity: number, offset: number) => {
      if (!element) return;
      element.style.opacity = String(opacity);
      element.style.visibility = opacity > 0.015 ? 'visible' : 'hidden';
      element.style.pointerEvents = opacity > 0.72 ? 'auto' : 'none';
      element.style.transform = `translate3d(0, ${offset}px, 0) scale(${0.992 + opacity * 0.008})`;
    };
    const update = () => {
      const track = trackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      const range = Math.max(1, track.offsetHeight - window.innerHeight);
      const progress = Math.max(0, Math.min(1, -rect.top / range));
      progressRef.current = progress;
    };
    const animateScroll = () => {
      current += (progressRef.current - current) * (reducedMotion ? 1 : 0.095);
      const heroOut = 1 - smoothstep(0.1, 0.23, current);
      const heroOpacity = heroOut;
      const panelOpacity = smoothstep(0.17, 0.29, current) * (1 - smoothstep(0.53, 0.65, current));
      const agoraOpacity = smoothstep(0.59, 0.7, current);
      showScene(heroSceneRef.current, heroOpacity, (1 - heroOpacity) * -10);
      showScene(panelSceneRef.current, panelOpacity, (1 - panelOpacity) * 14);
      showScene(agoraSceneRef.current, agoraOpacity, (1 - agoraOpacity) * 14);
      const nextPhase = current < 0.2 ? 'hero' : current < 0.6 ? 'panel' : 'agora';
      if (nextPhase !== currentPhase) {
        currentPhase = nextPhase;
        setPhase(nextPhase);
      }
      animationRaf = requestAnimationFrame(animateScroll);
    };
    const onScroll = () => {
      cancelAnimationFrame(scrollRaf);
      scrollRaf = requestAnimationFrame(update);
    };
    update();
    animationRaf = requestAnimationFrame(animateScroll);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(scrollRaf);
      cancelAnimationFrame(animationRaf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  const scrollToPanel = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    window.scrollTo({ top: track.offsetTop + window.innerHeight * 0.72, behavior: 'smooth' });
  }, []);

  const activateCompanion = useCallback(() => {
    setCompanionHappy(true);
    setCompanionStartSignal((signal) => signal + 1);
    sceneRef.current?.setHappy(true);
    if (companionButtonRef.current) {
      animate(companionButtonRef.current, { scale: [1, 1.045, 1], duration: 620, ease: 'out(3)' });
    }
    window.setTimeout(() => {
      setCompanionHappy(false);
      sceneRef.current?.setHappy(false);
    }, 2200);
  }, []);

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const x = (event.clientX / window.innerWidth) * 2 - 1;
    const y = -((event.clientY / window.innerHeight) * 2 - 1);
    sceneRef.current?.setPointer(x, y);
  }, []);

  const heroVisible = phase === 'hero';

  return (
    <main className={styles.page} onPointerMove={handlePointerMove}>
      <div ref={trackRef} className={styles.scrollTrack}>
        <div className={styles.stickyStage}>
          <header className={styles.brand}>RoundTable AI</header>
          <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />

          <section ref={heroSceneRef} className={styles.scene} data-active={heroVisible} aria-hidden={!heroVisible}>
            <div className={styles.heroCopy}>
              <p data-reveal className={styles.eyebrow}>Adaptive voice interviews</p>
              <h1 data-reveal>Hire the next generation of engineers.</h1>
            </div>
            <div data-reveal className={styles.heroActions}>
              <Button className={styles.primaryButton} onClick={scrollToPanel}>Try interview demo</Button>
              <Button asChild variant="outline" className={styles.secondaryButton}>
                <Link href="/company">Company login</Link>
              </Button>
            </div>
            {phase === 'hero' && <button className={styles.scrollCue} onClick={scrollToPanel} aria-label="See the interview panel"><ArrowDown /></button>}
          </section>

          <section ref={panelSceneRef} className={styles.scene} data-active={phase === 'panel'} aria-hidden={phase !== 'panel'}>
            <div className={styles.panelHeading}>
              <p data-reveal className={styles.eyebrow}>Shared context. Controlled turns.</p>
              <h2 data-reveal>One candidate. Five perspectives.</h2>
            </div>
            <div className={styles.roleMap} aria-label="Five AI interviewer roles">
              {roles.map((role) => <span key={role.label} className={`${styles.roleLabel} ${role.className}`}>{role.label}</span>)}
            </div>
            <Card data-reveal className={styles.demoCard}>
              <CardHeader className={styles.demoCardHeader}>
                <span><Mic size={15} /> Live voice sample</span>
                <span className={styles.agoraDot}>Agora</span>
              </CardHeader>
              <VoiceDemo variant="compact-demo" />
            </Card>
          </section>

          <section ref={agoraSceneRef} className={styles.scene} data-active={phase === 'agora'} aria-hidden={phase !== 'agora'}>
            <div className={styles.agoraHeading}>
              <p data-reveal className={styles.eyebrow}>Real-time. Interruptible. Voice native.</p>
              <h2 data-reveal>Powered by Agora Conversational AI.</h2>
            </div>
            <button
              ref={companionButtonRef}
              type="button"
              className={styles.companionTarget}
              onClick={activateCompanion}
              aria-label="Meet the RoundTable companion"
              aria-pressed={companionHappy}
            >
              <span className={styles.companionPrompt}><Volume2 />Tap the companion</span>
            </button>
            <div className={styles.companionTranscript} aria-live="polite">
              <VoiceDemo variant="companion-demo" startSignal={companionStartSignal} />
            </div>
          </section>

          <nav className={styles.progress} aria-label="Page progress">
            {(['hero', 'panel', 'agora'] as const).map((item) => (
              <span key={item} data-current={phase === item} />
            ))}
          </nav>
        </div>
      </div>
    </main>
  );
}
