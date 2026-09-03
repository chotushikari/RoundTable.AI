import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    // This logs structured events for the Two-Speed Intelligence backend
    console.log('\n[StructuredEvent]', JSON.stringify(data, null, 2));
    
    // In Sprint 02, this is where we will route events to the Candidate State Orchestrator
    
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to parse event' }, { status: 400 });
  }
}
