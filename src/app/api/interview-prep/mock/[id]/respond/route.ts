import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { callClaudeJSON } from "@/lib/ai/client";
import { buildMockInterviewSystem, buildMockInterviewMessage } from "@/lib/ai/prompts/mock-interview";
import { MockInterviewResponseSchema, type MockInterviewResponse } from "@/lib/ai/schemas/prep-package";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { answer } = body as { answer: string };

  if (!answer || !answer.trim()) {
    return NextResponse.json(
      { error: "Answer is required" },
      { status: 400 }
    );
  }

  const mockInterview = await prisma.mockInterview.findUnique({
    where: { id },
    include: {
      prep: {
        include: {
          application: {
            include: { job: true },
          },
        },
      },
    },
  });

  if (!mockInterview) {
    return NextResponse.json(
      { error: "Mock interview not found" },
      { status: 404 }
    );
  }

  if (mockInterview.prep.userId !== session.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const job = mockInterview.prep.application?.job;
  if (!job) {
    return NextResponse.json(
      { error: "No job associated with this interview" },
      { status: 400 }
    );
  }

  const transcript: Array<{ role: string; content: string }> = mockInterview.transcript
    ? JSON.parse(mockInterview.transcript)
    : [];

  // Add the candidate's answer to the transcript
  transcript.push({ role: "candidate", content: answer });

  // Calculate current question number based on interviewer entries
  const interviewerCount = transcript.filter(
    (t) => t.role === "interviewer"
  ).length;
  const questionNumber = interviewerCount + 1;

  try {
    const response = await callClaudeJSON<MockInterviewResponse>({
      system: buildMockInterviewSystem(job.company, job.title),
      userMessage: buildMockInterviewMessage(
        questionNumber,
        transcript,
        answer
      ),
      maxTokens: 2048,
    });

    const validated = MockInterviewResponseSchema.parse(response);

    // Add feedback to transcript
    if (validated.feedback) {
      transcript.push({ role: "feedback", content: validated.feedback });
    }

    // Add next question to transcript if the interview continues
    if (validated.nextQuestion && !validated.isComplete) {
      transcript.push({ role: "interviewer", content: validated.nextQuestion });
    }

    // Update the mock interview record
    const updateData: {
      transcript: string;
      feedback?: string;
      score?: number;
    } = {
      transcript: JSON.stringify(transcript),
    };

    if (validated.isComplete) {
      updateData.feedback = validated.overallFeedback || undefined;
      updateData.score = validated.overallScore || undefined;
    }

    await prisma.mockInterview.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      feedback: validated.feedback,
      nextQuestion: validated.nextQuestion || null,
      isComplete: validated.isComplete,
      overallScore: validated.overallScore || null,
      overallFeedback: validated.overallFeedback || null,
      questionNumber: validated.isComplete ? interviewerCount : questionNumber,
      transcript,
    });
  } catch (error) {
    console.error("Mock interview respond error:", error);
    return NextResponse.json(
      { error: "Failed to process answer" },
      { status: 500 }
    );
  }
}
