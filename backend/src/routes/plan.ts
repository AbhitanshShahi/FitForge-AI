import { Router, type Request, type Response } from "express";
import { prisma } from "../lib/prisma.js";
import { generateTrainingPlan } from "../lib/ai.js";

export const planRouter = Router();

planRouter.post("/generate", async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    const profile = await prisma.user_profiles.findUnique({
      where: {
        user_id: userId,
      },
    });

    if (!profile) {
      return res
        .status(400)
        .json({ error: "User Profile Not found, Complete Onboarding first" });
    }

    const latestPlan = await prisma.training_plans.findFirst({
      where: {
        user_id: userId,
      },
      orderBy: {
        created_at: "desc",
      },
      select: {
        version: true,
      },
    });

    const nextVersion = latestPlan ? latestPlan.version + 1 : 1;
    let planJson;

    try {
      planJson = await generateTrainingPlan(profile);
    } catch (error) {
      console.error("AI generation failed", error);
      return res.status(500).json({
        error: "AI generation failed",
        details: error instanceof Error ? error.message : "Unkown Error",
      });
    }

    const planText = JSON.stringify(planJson, null, 2);

    const newPlan = await prisma.training_plans.create({
      data: {
        user_id: userId,
        plan_json: planJson as any,
        plan_text: planText,
        version: nextVersion,
      },
    });

    res.json({
      id: newPlan.id,
      version: newPlan.version,
      createdAt: newPlan.created_at,
    });
  } catch (error) {
    console.error(`Error saving the Profile: ${error}`);
    res.status(500).json({ error: "Error in Profile router saving the Plan" });
  }
});

planRouter.get("/current", async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string;
    if(!userId){
      return res.status(400).json({ error: "User ID is required" });
    }

    const plan = await prisma.training_plans.findFirst({
      where: { user_id: userId  },
      orderBy: {created_at: "desc"}
    })

    if (!plan) {
      return res.json(null);
    }

    res.json({
      id: plan.id,
      userId: plan.user_id,
      planJson: plan.plan_json,
      planText: plan.plan_text,
      version: plan.version,
      createdAt: plan.created_at,
    })

  } catch (error) {
    console.error("Error Fetching plan: ", error);
    res.status(500).json({ error: "Error Fetching Plan" });
  }
});
