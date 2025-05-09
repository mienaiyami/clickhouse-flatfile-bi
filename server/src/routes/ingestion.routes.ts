import { Router } from "express";
import { IngestionController } from "../controllers/ingestion.controller";
import { validateRequestBody } from "../middleware/validation.middleware";
import multer from "multer";
import {
    clickhouseConnectionSchema,
    tableRequestSchema,
    columnsRequestSchema,
    previewDataRequestSchema,
    schemaRequestSchema,
    dataTransferConfigSchema,
} from "../validators";

const router = Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit
    },
});

router.post(
    "/check-connection",
    validateRequestBody(clickhouseConnectionSchema),
    IngestionController.validateConnection
);

router.post(
    "/tables",
    validateRequestBody(clickhouseConnectionSchema),
    IngestionController.getTables
);

router.post(
    "/columns",
    validateRequestBody(columnsRequestSchema),
    IngestionController.getColumns
);

router.post(
    "/schema",
    validateRequestBody(schemaRequestSchema),
    IngestionController.getTableSchema
);

router.post(
    "/preview",
    validateRequestBody(previewDataRequestSchema),
    IngestionController.previewData
);

router.post(
    "/transfer",
    validateRequestBody(dataTransferConfigSchema),
    IngestionController.startTransfer
);

router.post(
    "/import",
    upload.single("file"), // 'file' is the field name expected in the form data
    validateRequestBody(dataTransferConfigSchema),
    IngestionController.importData
);

router.post(
    "/export",
    validateRequestBody(dataTransferConfigSchema),
    IngestionController.exportData
);

router.post(
    "/stream-export",
    validateRequestBody(dataTransferConfigSchema),
    IngestionController.streamExport
);

export default router;
