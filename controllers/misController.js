import { misService } from '../services/misService.js';

export const misController = {
  /**
   * GET /api/mis/overview
   * Returns complete live MIS metrics, KPIs, series, and reports.
   */
  async getOverview(req, res) {
    try {
      const period = req.query.period || 'monthly';
      const data = await misService.getMISDashboardData(period);
      res.json({
        success: true,
        data,
      });
    } catch (err) {
      console.error('Error in misController.getOverview:', err);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve MIS dashboard data',
        error: err.message,
      });
    }
  },
};

export default misController;
