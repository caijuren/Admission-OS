import { NextResponse } from "next/server";
import { readData, writeData, type EduosData } from "@/lib/server/data-store";
import { getRequestAuth, setAuthCookies } from "@/lib/server/auth";
import type { GrowthEvent } from "@/types";
import type { NextRequest } from "next/server";

function dataErrorResponse(error: unknown) {
  console.error("Data API error:", error);
  return NextResponse.json({ error: "Failed to read or write Admission OS data." }, { status: 500 });
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getRequestAuth(request);
    if (!auth.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await readData(auth.user.id);
    const response = NextResponse.json(data);
    if (auth.session) setAuthCookies(response, auth.session);
    return response;
  } catch (error) {
    return dataErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await getRequestAuth(request);
    if (!auth.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const patch = await request.json() as Partial<EduosData>;
    const data = await readData(auth.user.id);
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
      pathwayStages: patch.pathwayStages || data.pathwayStages,
    };

    await writeData(auth.user.id, nextData);
    const response = NextResponse.json(nextData);
    if (auth.session) setAuthCookies(response, auth.session);
    return response;
  } catch (error) {
    return dataErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getRequestAuth(request);
    if (!auth.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json() as {
      event?: GrowthEvent;
      events?: GrowthEvent[];
      pathwayStages?: EduosData["pathwayStages"];
      goals?: EduosData["goals"];
      goalTasks?: EduosData["goalTasks"];
      goalLogs?: EduosData["goalLogs"];
      goalPhases?: EduosData["goalPhases"];
    };
    const data = await readData(auth.user.id);

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

    await writeData(auth.user.id, data);
    const response = NextResponse.json(data);
    if (auth.session) setAuthCookies(response, auth.session);
    return response;
  } catch (error) {
    return dataErrorResponse(error);
  }
}
