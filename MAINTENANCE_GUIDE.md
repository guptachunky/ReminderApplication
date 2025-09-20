# Maintenance & Operations Guide - Enhanced Reminder Application

This guide provides comprehensive instructions for maintaining and operating your enhanced reminder application with payment tracking features.

## 📊 Daily Operations

### Monitoring Dashboard

**Key Metrics to Track:**
- Active reminders count
- Payment completion rate
- Notification delivery success rate
- User engagement with payment links

**Daily Checks (5 minutes):**
1. **Supabase Dashboard**
   - Check Edge Function execution logs
   - Monitor database usage and performance
   - Verify cron job execution status

2. **Brevo Dashboard**
   - Check email delivery rates
   - Monitor remaining email quota
   - Review bounce/spam rates

3. **Application Health**
   - Test user registration/login
   - Verify reminder creation works
   - Test payment marking functionality

### Quick Health Check Queries

Run these in Supabase SQL Editor:

```sql
-- Daily reminder statistics
SELECT 
  COUNT(*) as total_active_reminders,
  COUNT(CASE WHEN payment_status = 'unpaid' THEN 1 END) as unpaid_reminders,
  COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as paid_reminders,
  ROUND(
    COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) * 100.0 / COUNT(*), 2
  ) as payment_completion_rate
FROM reminders 
WHERE is_active = true;

-- Recent notification activity
SELECT 
  notification_type,
  COUNT(*) as sent_count,
  COUNT(CASE WHEN delivery_status = 'sent' THEN 1 END) as successful_deliveries
FROM sent_notifications 
WHERE sent_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY notification_type
ORDER BY sent_count DESC;

-- Cron job status
SELECT * FROM cron.job_run_details 
ORDER BY start_time DESC 
LIMIT 5;
```

## 🔧 Weekly Maintenance (15 minutes)

### Database Cleanup

**Clean Old Notifications (Run Weekly):**
```sql
-- Remove notification records older than 90 days
DELETE FROM sent_notifications 
WHERE sent_at < CURRENT_DATE - INTERVAL '90 days';

-- Archive old paid reminders (optional)
UPDATE reminders 
SET is_active = false 
WHERE payment_status = 'paid' 
  AND paid_at < CURRENT_DATE - INTERVAL '365 days';
```

### Performance Optimization

**Check and Optimize Indexes:**
```sql
-- Check index usage
SELECT schemaname, tablename, attname, n_distinct, correlation 
FROM pg_stats 
WHERE tablename IN ('reminders', 'sent_notifications', 'profiles');

-- Analyze table statistics
ANALYZE reminders;
ANALYZE sent_notifications;
ANALYZE profiles;
```

### Backup Verification

**Verify Supabase Backups:**
1. Go to Supabase Dashboard → Settings → Database
2. Check that daily backups are enabled
3. Verify recent backup timestamps
4. Test backup restoration process (monthly)

## 📈 Monthly Operations (30 minutes)

### Usage Analytics

**Generate Monthly Report:**
```sql
-- Monthly reminder creation trends
SELECT 
  DATE_TRUNC('month', created_at) as month,
  COUNT(*) as reminders_created,
  COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as payments_completed
FROM reminders 
WHERE created_at >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month DESC;

-- User engagement metrics
SELECT 
  COUNT(DISTINCT user_id) as active_users,
  AVG(reminder_count) as avg_reminders_per_user
FROM (
  SELECT user_id, COUNT(*) as reminder_count
  FROM reminders 
  WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY user_id
) user_stats;

-- Notification effectiveness
SELECT 
  notification_type,
  COUNT(*) as total_sent,
  COUNT(CASE WHEN EXISTS(
    SELECT 1 FROM reminders r 
    WHERE r.id = sn.reminder_id 
    AND r.payment_status = 'paid'
    AND r.paid_at > sn.sent_at
  ) THEN 1 END) as led_to_payment
FROM sent_notifications sn
WHERE sent_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY notification_type;
```

### Quota Management

**Check Service Limits:**
1. **Supabase**: Database size, API requests, Edge Function invocations
2. **Brevo**: Email quota usage and reset date
3. **Vercel**: Bandwidth and function execution time
4. **Textbelt**: SMS quota (if using paid plan)

### Security Review

**Monthly Security Checklist:**
- [ ] Review user access logs
- [ ] Check for suspicious payment marking activity
- [ ] Verify RLS policies are working correctly
- [ ] Update dependencies if security patches available
- [ ] Review API endpoint access logs

## 🚨 Troubleshooting Common Issues

### Issue: Reminders Not Sending

**Diagnosis Steps:**
1. Check cron job execution:
   ```sql
   SELECT * FROM cron.job_run_details 
   WHERE job_name = 'send-daily-reminders'
   ORDER BY start_time DESC LIMIT 5;
   ```

2. Test Edge Function manually:
   ```bash
   supabase functions invoke send-reminders --method POST
   ```

3. Check function logs in Supabase Dashboard

**Common Fixes:**
- Verify environment variables are set correctly
- Check Brevo API key validity
- Ensure Telegram bot token is active
- Verify Vault secrets are accessible

### Issue: Payment Links Not Working

**Diagnosis Steps:**
1. Test payment confirmation page directly
2. Check API endpoint logs
3. Verify token generation logic

**Common Fixes:**
- Ensure Vercel deployment URL is correct in Edge Function
- Check API route is deployed correctly
- Verify database function permissions

### Issue: High Email Bounce Rate

**Diagnosis Steps:**
1. Check Brevo dashboard for bounce reasons
2. Review email content for spam triggers
3. Verify sender domain configuration

**Common Fixes:**
- Update email templates to reduce spam score
- Configure SPF/DKIM records for your domain
- Clean up invalid email addresses from profiles

## 📋 Maintenance Schedules

### Daily (Automated)
- Cron job executes reminder notifications
- Automatic database backups
- System health monitoring

### Weekly (Manual - 15 minutes)
- [ ] Review notification delivery rates
- [ ] Clean old notification records
- [ ] Check service quotas
- [ ] Verify payment link functionality

### Monthly (Manual - 30 minutes)
- [ ] Generate usage analytics report
- [ ] Review and optimize database performance
- [ ] Security audit and access review
- [ ] Update dependencies and patches
- [ ] Test backup restoration process

### Quarterly (Manual - 1 hour)
- [ ] Comprehensive security review
- [ ] Performance optimization
- [ ] User feedback analysis
- [ ] Feature usage evaluation
- [ ] Disaster recovery testing

## 🔄 Scaling Considerations

### When to Upgrade

**Database Scaling Indicators:**
- Database size approaching free tier limit (500MB)
- Query performance degradation
- High concurrent user load

**Email Scaling Indicators:**
- Approaching Brevo free tier limit (300 emails/day)
- Need for advanced email features
- Higher delivery rate requirements

**Infrastructure Scaling:**
- Vercel function timeout issues
- Need for custom domain
- Advanced monitoring requirements

### Upgrade Paths

1. **Supabase Pro**: $25/month for larger database and better performance
2. **Brevo Starter**: $25/month for 20,000 emails/month
3. **Vercel Pro**: $20/month for advanced features and analytics

## 📞 Support Resources

### Documentation Links
- [Supabase Documentation](https://supabase.com/docs)
- [Brevo API Documentation](https://developers.brevo.com)
- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)

### Emergency Contacts
- Supabase Support: support@supabase.io
- Brevo Support: Available in dashboard
- Vercel Support: Available in dashboard

### Monitoring Tools
- Supabase Dashboard: Real-time metrics and logs
- Brevo Dashboard: Email delivery statistics
- Vercel Analytics: Performance and usage metrics

---

**Remember**: Regular maintenance ensures optimal performance and user experience. Set up calendar reminders for weekly and monthly maintenance tasks.
