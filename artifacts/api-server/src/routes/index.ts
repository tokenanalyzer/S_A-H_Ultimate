import { Router, type IRouter } from "express";
import healthRouter from "./health";
import scoutRouter from "./scout";
import harvesterRouter from "./harvester";
import analysisRouter from "./analysis";
import bountyRouter from "./bounty";

const router: IRouter = Router();

router.use(healthRouter);
router.use(scoutRouter);
router.use(harvesterRouter);
router.use(analysisRouter);
router.use(bountyRouter);

export default router;
