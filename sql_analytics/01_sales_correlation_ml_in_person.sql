-- Correlación de volumen de ventas presenciales con flujos de ingresos provenientes de Mercado Libre
-- Usa CTEs y Funciones de Ventana para analizar tendencias temporales y participación por canal

WITH DailySales AS (
    SELECT 
        DATE_TRUNC('day', s.created_at) AS sale_date,
        s.channel, -- 'POS' (presencial) o 'ML' (Mercado Libre)
        COUNT(s.id) AS total_transactions,
        SUM(s.total_amount) AS daily_revenue
    FROM 
        sales s
    WHERE 
        s.status = 'completed'
    GROUP BY 
        1, 2
),
PivotSales AS (
    SELECT 
        sale_date,
        SUM(CASE WHEN channel = 'POS' THEN daily_revenue ELSE 0 END) AS pos_revenue,
        SUM(CASE WHEN channel = 'ML' THEN daily_revenue ELSE 0 END) AS ml_revenue,
        SUM(CASE WHEN channel = 'POS' THEN total_transactions ELSE 0 END) AS pos_transactions,
        SUM(CASE WHEN channel = 'ML' THEN total_transactions ELSE 0 END) AS ml_transactions
    FROM 
        DailySales
    GROUP BY 
        sale_date
),
MovingAverages AS (
    SELECT 
        sale_date,
        pos_revenue,
        ml_revenue,
        pos_transactions,
        ml_transactions,
        SUM(pos_revenue) OVER (ORDER BY sale_date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) AS pos_7d_rolling_rev,
        SUM(ml_revenue) OVER (ORDER BY sale_date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) AS ml_7d_rolling_rev,
        -- Window function to calculate the daily total across both channels
        (pos_revenue + ml_revenue) AS total_daily_revenue,
        -- Percentage share
        CASE 
            WHEN (pos_revenue + ml_revenue) > 0 
            THEN pos_revenue / (pos_revenue + ml_revenue) * 100 
            ELSE 0 
        END AS pos_revenue_share_pct,
        CASE 
            WHEN (pos_revenue + ml_revenue) > 0 
            THEN ml_revenue / (pos_revenue + ml_revenue) * 100 
            ELSE 0 
        END AS ml_revenue_share_pct
    FROM 
        PivotSales
)
SELECT 
    sale_date,
    pos_revenue,
    ml_revenue,
    total_daily_revenue,
    pos_7d_rolling_rev,
    ml_7d_rolling_rev,
    pos_revenue_share_pct,
    ml_revenue_share_pct,
    -- Variación porcentual respecto al día anterior (lag)
    (pos_revenue - LAG(pos_revenue) OVER (ORDER BY sale_date)) / NULLIF(LAG(pos_revenue) OVER (ORDER BY sale_date), 0) * 100 AS pos_daily_growth_pct,
    (ml_revenue - LAG(ml_revenue) OVER (ORDER BY sale_date)) / NULLIF(LAG(ml_revenue) OVER (ORDER BY sale_date), 0) * 100 AS ml_daily_growth_pct
FROM 
    MovingAverages
ORDER BY 
    sale_date DESC;
