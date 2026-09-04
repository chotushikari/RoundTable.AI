# Bootstrap

The candidate first validates an invitation, accepts the fixed disclosure, and calls the invitation session route. The server chooses session/channel/UID values, creates a combined RTC+RTM token, stores only the LLM token hash, starts the Agora managed agent, and sets the signed candidate cookie. The browser logs into RTM and subscribes before mounting the RTC conversation component.

Legacy root quickstart endpoints remain for baseline comparison only. Product sessions must use the signed invitation route and authenticated lifecycle routes.
