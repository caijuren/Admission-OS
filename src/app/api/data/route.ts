import { NextResponse } from "next/server";
import { readData, writeData, type EduosData } from "@/lib/server/data-store";
import type { GrowthEvent } from "@/types";

function dataErrorResponse(error: unknown) {
  console.error("Data API error:", error);
  return NextResponse.json({ error: "Failed to read or write Admission OS data." }, { status: 500 });
}

export async function GET() {
  try {
    const data = await readData();
    return NextResponse.json(data);
  } catch (error) {
    return dataErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const patch = await request.json() as Partial<EduosData>;
    const data = await readData();
    const nextData: EduosData = {
      ...data,
      ...patch,
      profile: {
        ...data.profile,
        ...patch.profile,
      },
      journey: {
        ...data.journey,
        milestones: patch.journey?.milestones || data.journey.milestones,
      },
    };

    await writeData(nextData);
    return NextResponse.json(nextData);
  } catch (error) {
    return dataErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      event?: GrowthEvent;
      events?: GrowthEvent[];
      pathwayStages?: EduosData["pathwayStages"];
      goals?: EduosData["goals"];
      goalTasks?: EduosData["goalTasks"];
      goalLogs?: EduosData["goalLogs"];
      goalPhases?: EduosData["goalPhases"];
    };
    const data = await readData();

    if (body.events) {
      data.events = body.events;
    }

    if (body.event) {
      data.events = [body.event, ...data.events.filter((event) => event.id !== body.event!.id)];
    }

    if (body.pathwayStages) {
      data.pathwayStages = body.pathwayStages;
    }

    if (body.goals) {
      data.goals = body.goals;
    }

    if (body.goalTasks) {
      data.goalTasks = body.goalTasks;
    }

    if (body.goalLogs) {
      data.goalLogs = body.goalLogs;
    }

    if (body.goalPhases) {
      data.goalPhases = body.goalPhases;
    }

    await writeData(data);
    return NextResponse.json(data);
  } catch (error) {
    return dataErrorResponse(error);
  }
}
