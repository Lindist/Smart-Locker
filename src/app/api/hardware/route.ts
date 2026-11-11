import { NextRequest, NextResponse } from 'next/server';
import { lockerStore } from '@/lib/store';

// ESP32 polls this endpoint to check if it should trigger the Solenoid Relay
export async function GET() {
  const state = lockerStore.getState();

  return NextResponse.json({
    lockerId: state.id,
    command: state.hardwareCommand, // "UNLOCK" | "IDLE"
    doorState: state.doorState,
    status: state.status,
    timestamp: Date.now(),
  });
}

// ESP32 reports back command acknowledgment or sensor status (Reed switch)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, doorState } = body;

    // ESP32 reports that it has activated the relay
    if (action === 'ACK_UNLOCK') {
      lockerStore.acknowledgeHardwareCommand();
      return NextResponse.json({ success: true, message: 'Command acknowledged' });
    }

    // ESP32 reports magnetic door switch state
    if (doorState === 'OPEN' || doorState === 'CLOSED') {
      lockerStore.updateDoorState(doorState);
      return NextResponse.json({ success: true, doorState });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Hardware API error';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
