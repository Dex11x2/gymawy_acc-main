import { Router } from 'express';
import { protect } from '../middleware/auth.middleware';
import * as reportSettingsController from '../controllers/reportSettings.controller';

const router = Router();

router.use(protect);

router.get('/', reportSettingsController.getSettings);
router.put('/', reportSettingsController.updateSettings);
router.put('/toggle', reportSettingsController.toggleEnabled);
router.put('/recipients', reportSettingsController.updateRecipients);
router.put('/send-time', reportSettingsController.updateSendTime);
router.put('/sections', reportSettingsController.updateReportSections);
router.post('/test', reportSettingsController.sendTestReport);
router.post('/send-now', reportSettingsController.sendNowReport);
router.get('/history', reportSettingsController.getReportHistory);
router.post('/test-recipient', reportSettingsController.testRecipientEmail);
router.get('/logs', reportSettingsController.getReportLogs);
router.put('/sender', reportSettingsController.updateSenderInfo);
router.put('/format', reportSettingsController.updateReportFormat);

export default router;
