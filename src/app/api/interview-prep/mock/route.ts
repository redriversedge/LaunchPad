import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { callClaudeJSON } from "@/lib/ai/client";
import { buildMockInterviewSystem, buildMockInterviewMessage } from "@/lib/ai/prompts/mock-interview";
import { MockInterviewResponseSchema, type MockInterviewResponse } from "@/lib/ai/schemas/prep-package";

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { prepId, type } = body as { prepId: string; type: string };

  if (!prepId || !type) {
    return NextResponse.json(
      { error: "prepId and type are required" },
      { status: 400 }
    );
  }

  if (!["behavioral", "technical", "case"].includes(type)) {
    return NextResponse.json(
      { error: "type must be behavioral, technical, or case" },
      { status: 400 }
    );
  }

  const prep = await prisma.interviewPrep.findFirst({
    where: {
      id: prepId,
      userId: session.user.id,
    },
    include: {
      application: {
        include: { job: true },
      },
    },
  });

  if (!prep) {
    return NextResponse.json(
      { error: "Interview prep not found" },
      { status: 404 }
    );
  }

  const job = prep.application?.job;
  if (!job) {
    return NextResponse.json(
      { error: "No job associated with this prep" },
      { status: 400 }
    );
  }

  try {
    // Get the first question from the AI interviewer
    const response = await callClaudeJSON<MockInterviewResponse>({
      system: buildMockInterviewSystem(
        job.company,
        job.title,
        undefined
      ),
      userMessage: buildMockInterviewMessage(1, [], ""),
      maxTokens: 2048,
    });

    const validated = MockInterviewResponseSchema.parse(response);

    // Create the mock interview record with the first question in the transcript
    const transcript = [
      { role: "interviewer", content: validated.nextQuestion || "" },
    ];

    const mockInterview = await prisma.mockInterview.create({
      data: {
        prepId,
        type,
        transcript: JSON.stringify(transcript),
      },
    });

    return NextResponse.json({
      id: mockInterview.id,
      type: mockInterview.type,
      questionNumber: 1,
      question: validated.nextQuestion || "",
      transcript,
    });
  } catch (error) {
    console.error("Mock interview start error:", error);
    return NextResponse.json(
      { error: "Failed to start mock interview" },
      { status: 500 }
    );
  }
}
