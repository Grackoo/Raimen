-- Cálculo de ROI y márgenes de cohorte estacional
-- Resta inversiones temporales de mercancía y gastos operativos fijos (financial_transactions) al ingreso (sales)

WITH CohortRevenue AS (
    SELECT 
        c.id AS campaign_id,
        c.name AS campaign_name,
        c.season,
        SUM(s.total_amount) AS total_gross_revenue,
        -- Calculate total cost of goods sold (COGS) if available via items, otherwise handle via financial_transactions
        SUM(si.quantity * si.unit_cost) AS total_cogs
    FROM 
        campaigns c
    JOIN 
        sales s ON s.campaign_id = c.id
    JOIN 
        sale_items si ON si.sale_id = s.id
    WHERE 
        s.status = 'completed'
    GROUP BY 
        1, 2, 3
),
CohortExpenses AS (
    SELECT 
        ft.campaign_id,
        SUM(CASE WHEN ft.transaction_category = 'merchandise_investment' THEN ft.amount ELSE 0 END) AS merchandise_investment,
        SUM(CASE WHEN ft.transaction_category = 'fixed_operational' THEN ft.amount ELSE 0 END) AS fixed_operational_costs,
        SUM(ft.amount) AS total_expenses
    FROM 
        financial_transactions ft
    WHERE 
        ft.transaction_type = 'expense'
    GROUP BY 
        ft.campaign_id
)
SELECT 
    cr.campaign_id,
    cr.campaign_name,
    cr.season,
    cr.total_gross_revenue,
    cr.total_cogs,
    COALESCE(ce.merchandise_investment, 0) AS merchandise_investment,
    COALESCE(ce.fixed_operational_costs, 0) AS fixed_operational_costs,
    -- Margen Bruto: Ingresos - Costo de Ventas
    (cr.total_gross_revenue - cr.total_cogs) AS gross_margin_absolute,
    CASE 
        WHEN cr.total_gross_revenue > 0 
        THEN ((cr.total_gross_revenue - cr.total_cogs) / cr.total_gross_revenue) * 100 
        ELSE 0 
    END AS gross_margin_pct,
    -- Beneficio Neto: Ingresos - (Costo de Ventas + Gastos Operativos e Inversiones Temporales)
    (cr.total_gross_revenue - cr.total_cogs - COALESCE(ce.total_expenses, 0)) AS net_profit,
    -- ROI (Retorno de Inversión): (Beneficio Neto / Inversión Total) * 100
    -- Inversión total se considera como (Costo de Ventas + Gastos Operativos e Inversiones Temporales)
    CASE 
        WHEN (cr.total_cogs + COALESCE(ce.total_expenses, 0)) > 0 
        THEN ((cr.total_gross_revenue - (cr.total_cogs + COALESCE(ce.total_expenses, 0))) / (cr.total_cogs + COALESCE(ce.total_expenses, 0))) * 100
        ELSE 0 
    END AS roi_pct
FROM 
    CohortRevenue cr
LEFT JOIN 
    CohortExpenses ce ON cr.campaign_id = ce.campaign_id
ORDER BY 
    cr.season, cr.campaign_name;
