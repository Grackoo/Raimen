// backend/analytics.js

/**
 * Retrieves sales correlation data between physical (local) sales and Mercado Libre (ML) sales.
 * Uses cash_shifts for local sales and inventory_items for product data.
 * @param {Pool} dbClient - PostgreSQL database client
 * @returns {Promise<Array>} List of sales correlation data
 */
async function getSalesCorrelation(dbClient) {
  const query = `
    SELECT 
      ii.id AS item_id,
      ii.name AS item_name,
      ii.local_price,
      COALESCE(SUM(s.quantity), 0) AS total_local_sales,
      COALESCE(ii.ml_sales, 0) AS ml_sales,
      (COALESCE(SUM(s.quantity), 0) * ii.local_price) AS local_revenue,
      (COALESCE(ii.ml_sales, 0) * ii.ml_price) AS ml_revenue
    FROM 
      inventory_items ii
    LEFT JOIN 
      sales s ON ii.id = s.item_id
    LEFT JOIN 
      cash_shifts cs ON s.shift_id = cs.id
    WHERE 
      cs.status = 'closed' OR cs.status IS NULL
    GROUP BY 
      ii.id, ii.name, ii.local_price, ii.ml_price, ii.ml_sales
    ORDER BY 
      total_local_sales DESC;
  `;
  
  try {
    const result = await dbClient.query(query);
    return result.rows;
  } catch (error) {
    console.error("Error executing getSalesCorrelation query:", error);
    throw error;
  }
}

/**
 * Retrieves KPI data for the dashboard.
 * @param {Pool} dbClient - PostgreSQL database client
 */
async function getDashboardKPIs(dbClient) {
  const kpiQuery = `
    WITH LocalSales AS (
      SELECT SUM(s.quantity * ii.local_price) AS total_local_revenue
      FROM sales s
      JOIN inventory_items ii ON s.item_id = ii.id
      JOIN cash_shifts cs ON s.shift_id = cs.id
    ),
    MLSales AS (
      SELECT SUM(ml_sales * ml_price) AS total_ml_revenue
      FROM inventory_items
    )
    SELECT 
      (SELECT total_local_revenue FROM LocalSales) AS local_revenue,
      (SELECT total_ml_revenue FROM MLSales) AS ml_revenue
  `;
  
  try {
    const result = await dbClient.query(kpiQuery);
    return result.rows[0];
  } catch (error) {
    console.error("Error executing getDashboardKPIs query:", error);
    throw error;
  }
}

module.exports = {
  getSalesCorrelation,
  getDashboardKPIs
};
