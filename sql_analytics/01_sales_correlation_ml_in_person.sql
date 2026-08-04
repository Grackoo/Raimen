-- Correlación de volumen de ventas presenciales con flujos de ingresos provenientes de Mercado Libre
-- Usa CTEs y Funciones de Ventana para analizar tendencias temporales y participación por sucursal

WITH DailySales AS (
    SELECT 
        DATE_TRUNC('day', s.created_at) AS sale_date,
        s.branch_id,
        b.name AS branch_name,
        b.is_virtual,
        COUNT(s.id) AS total_transactions,
        SUM(s.total_amount) AS daily_revenue
    FROM 
        sales s
    LEFT JOIN 
        branches b ON s.branch_id = b.id
    WHERE 
        s.status = 'completed'
    GROUP BY 
        1, 2, 3, 4
),
MovingAverages AS (
    SELECT 
        sale_date,
        branch_id,
        branch_name,
        is_virtual,
        total_transactions,
        daily_revenue,
        -- Window function to calculate the 7-day rolling revenue for each branch
        SUM(daily_revenue) OVER (PARTITION BY branch_id ORDER BY sale_date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) AS branch_7d_rolling_rev,
        -- Window function to calculate the daily total across all branches
        SUM(daily_revenue) OVER (PARTITION BY sale_date) AS total_daily_revenue_all_branches
    FROM 
        DailySales
)
SELECT 
    sale_date,
    branch_id,
    branch_name,
    is_virtual,
    total_transactions,
    daily_revenue,
    total_daily_revenue_all_branches,
    branch_7d_rolling_rev,
    -- Percentage share of the branch relative to total daily sales
    CASE 
        WHEN total_daily_revenue_all_branches > 0 
        THEN (daily_revenue / total_daily_revenue_all_branches) * 100 
        ELSE 0 
    END AS branch_revenue_share_pct,
    -- Variación porcentual respecto al día anterior (lag) por sucursal
    (daily_revenue - LAG(daily_revenue) OVER (PARTITION BY branch_id ORDER BY sale_date)) / 
        NULLIF(LAG(daily_revenue) OVER (PARTITION BY branch_id ORDER BY sale_date), 0) * 100 AS branch_daily_growth_pct
FROM 
    MovingAverages
ORDER BY 
    sale_date DESC, is_virtual DESC, branch_id;
