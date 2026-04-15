-- These queries are examples. Your actual table/column names are detected at runtime.

-- Total users
-- SELECT COUNT(*) FROM users;

-- Trades per day
-- SELECT DATE(close_time) AS d, COUNT(*) AS trades
-- FROM deals
-- WHERE close_time >= :start AND close_time < :end
-- GROUP BY DATE(close_time)
-- ORDER BY d;

-- Profit/Loss over time
-- SELECT DATE(close_time) AS d, SUM(profit + swap - commission) AS pnl
-- FROM deals
-- WHERE close_time >= :start AND close_time < :end
-- GROUP BY DATE(close_time)
-- ORDER BY d;

-- Top instruments by volume
-- SELECT symbol, SUM(volume) AS vol
-- FROM deals
-- WHERE close_time >= :start AND close_time < :end
-- GROUP BY symbol
-- ORDER BY vol DESC
-- LIMIT 20;

-- Win rate
-- SELECT
--   SUM(CASE WHEN profit > 0 THEN 1 ELSE 0 END) / COUNT(*) AS win_rate
-- FROM deals
-- WHERE close_time >= :start AND close_time < :end;

