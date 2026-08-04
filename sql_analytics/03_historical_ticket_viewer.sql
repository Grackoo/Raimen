-- Visor archivístico histórico de tickets
-- Permite consultar los registros inmutables de sales y sale_items por sucursal

WITH TicketDetails AS (
    SELECT 
        s.id AS ticket_id,
        s.ticket_number,
        s.created_at AS ticket_date,
        s.branch_id,
        b.name AS branch_name,
        b.is_virtual,
        s.customer_id,
        c.full_name AS customer_name,
        s.subtotal,
        s.tax_amount,
        s.discount_amount,
        s.total_amount,
        s.payment_method,
        s.status,
        -- JSON aggregation of items for easy visualization in a dashboard
        JSON_AGG(
            JSON_BUILD_OBJECT(
                'item_id', si.id,
                'product_id', si.product_id,
                'product_name', p.name,
                'quantity', si.quantity,
                'unit_price', si.unit_price,
                'discount', si.discount_amount,
                'subtotal', si.subtotal
            )
        ) AS items_json,
        -- Total items count
        SUM(si.quantity) AS total_items
    FROM 
        sales s
    LEFT JOIN 
        customers c ON s.customer_id = c.id
    LEFT JOIN 
        branches b ON s.branch_id = b.id
    JOIN 
        sale_items si ON s.id = si.sale_id
    JOIN 
        products p ON si.product_id = p.id
    WHERE 
        -- Optional: Filter for specific time range or status for the archival view
        s.status IN ('completed', 'refunded')
    GROUP BY 
        1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14
)
SELECT 
    ticket_id,
    ticket_number,
    ticket_date,
    branch_id,
    branch_name,
    is_virtual,
    customer_name,
    total_items,
    subtotal,
    tax_amount,
    discount_amount,
    total_amount,
    payment_method,
    status,
    items_json,
    -- Window functions to compare current ticket total against the daily average for archival context per branch
    AVG(total_amount) OVER (PARTITION BY DATE_TRUNC('day', ticket_date), branch_id) AS daily_avg_ticket_branch,
    PERCENT_RANK() OVER (PARTITION BY DATE_TRUNC('day', ticket_date), branch_id ORDER BY total_amount) AS ticket_percentile_daily_branch
FROM 
    TicketDetails
ORDER BY 
    ticket_date DESC, ticket_number DESC;
