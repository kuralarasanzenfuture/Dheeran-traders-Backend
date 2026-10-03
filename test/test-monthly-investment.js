import db from "../src/config/db.js";
import {
  createMonthlyInvestmentPlan,
  getAllMonthlyInvestmentPlans,
  getMonthlyInvestmentPlanById,
  updateMonthlyInvestmentPlan,
  toggleMonthlyInvestmentPlanStatus,
  deleteMonthlyInvestmentPlan,
  previewMonthlyInvestmentPlanCode,
  getMonthlyInvestmentPlanOptions,
} from "../src/controllers/chit/monthly-investment/plan/monthlyInvestmentPlan.controller.js";
import {
  createMonthlyInvestmentPlanAmount,
  getAllMonthlyInvestmentPlanAmounts,
  getMonthlyInvestmentPlanAmountById,
  getMonthlyInvestmentPlanAmountsByPlanId,
  updateMonthlyInvestmentPlanAmount,
  toggleMonthlyInvestmentPlanAmountStatus,
  deleteMonthlyInvestmentPlanAmount,
} from "../src/controllers/chit/monthly-investment/plan-amount/monthlyInvestmentPlanAmount.controller.js";
import {
  createMonthlyInvestmentSubscription,
  previewMonthlyInvestmentSubscription,
  getAllMonthlyInvestmentSubscriptions,
  getMonthlyInvestmentSubscriptionById,
  updateMonthlyInvestmentSubscriptionStatus,
  deleteMonthlyInvestmentSubscription,
  getMonthlyInvestmentSubscriptionPreclosurePreview,
  precloseMonthlyInvestmentSubscription,
} from "../src/controllers/chit/monthly-investment/subscription/monthlyInvestmentSubscription.controller.js";
import {
  getSchedulesBySubscriptionId,
  getAllMonthlyInvestmentSchedules,
  getMonthlyInvestmentScheduleById,
  runDailyMonthlyInvestmentMaintenance,
  getMonthlyInvestmentDueSchedules,
  getMonthlyInvestmentDueSummary,
} from "../src/controllers/chit/monthly-investment/schedule/monthlyInvestmentSchedule.controller.js";
import {
  processMonthlyInvestmentPayment,
  getAllMonthlyInvestmentPayments,
  getMonthlyInvestmentPaymentById,
} from "../src/controllers/chit/monthly-investment/payment/monthlyInvestmentPayment.controller.js";

// Mock Express req and res helper
const createMockReqRes = (options = {}) => {
  const req = {
    body: options.body || {},
    params: options.params || {},
    query: options.query || {},
    user: options.user || { id: 1, name: "Test User" },
  };

  let statusCode = 200;
  let jsonResponse = null;

  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      jsonResponse = data;
      return this;
    },
    getStatusCode() {
      return statusCode;
    },
    getResponse() {
      return jsonResponse;
    },
  };

  return { req, res };
};

const runTests = async () => {
  console.log("🚀 Starting Monthly Investment Plan & Plan Amounts Test Suite...\n");

  try {
    // Clean up previous test data if any
    await db.query(`DELETE FROM monthly_investment_payments WHERE subscription_id IN (SELECT id FROM monthly_investment_subscriptions WHERE plan_id IN (SELECT id FROM monthly_investment_plans WHERE plan_name LIKE 'TEST_%'))`);
    await db.query(`DELETE FROM monthly_investment_interest_schedules WHERE subscription_id IN (SELECT id FROM monthly_investment_subscriptions WHERE plan_id IN (SELECT id FROM monthly_investment_plans WHERE plan_name LIKE 'TEST_%'))`);
    await db.query(`DELETE FROM monthly_investment_subscriptions WHERE plan_id IN (SELECT id FROM monthly_investment_plans WHERE plan_name LIKE 'TEST_%')`);
    await db.query(`DELETE FROM monthly_investment_plan_amounts WHERE plan_id IN (SELECT id FROM monthly_investment_plans WHERE plan_name LIKE 'TEST_%')`);
    await db.query(`DELETE FROM monthly_investment_plans WHERE plan_name LIKE 'TEST_%'`);

    // 1. Test previewMonthlyInvestmentPlanCode
    console.log("1️⃣ Testing previewMonthlyInvestmentPlanCode...");
    {
      const { req, res } = createMockReqRes({
        query: { plan_name: "TEST Wealth Builder Special" },
      });
      await previewMonthlyInvestmentPlanCode(req, res);
      const data = res.getResponse();
      console.log("   Preview result:", data.suggested_plan_code);
      if (!data.success || !data.suggested_plan_code.startsWith("MIP-TEST-WEALTH-BUILDER")) {
        throw new Error("Preview plan code failed");
      }
      console.log("   ✅ Preview plan code passed");
    }

    // 2. Test createMonthlyInvestmentPlan with initial amounts
    console.log("\n2️⃣ Testing createMonthlyInvestmentPlan with bulk amounts...");
    let planId;
    {
      const { req, res } = createMockReqRes({
        body: {
          plan_name: "TEST Golden Growth Monthly",
          description: "A test plan for monthly wealth building",
          plan_start_date: "2026-10-01",
          plan_end_date: "2027-10-01",
          amounts: [
            {
              principal_amount: 10000,
              minimum_monthly_interest: 200,
              maximum_monthly_interest: 300,
            },
            {
              principal_amount: 25000,
              minimum_monthly_interest: 500,
              maximum_monthly_interest: 750,
            },
          ],
        },
      });

      await createMonthlyInvestmentPlan(req, res);
      const data = res.getResponse();
      console.log("   Create response status:", res.getStatusCode());
      console.log("   Plan code created:", data.data?.plan_code);
      console.log("   Amounts count:", data.data?.amounts?.length);

      if (res.getStatusCode() !== 201 || !data.success) {
        throw new Error(`Create plan failed: ${JSON.stringify(data)}`);
      }
      if (data.data.amounts.length !== 2) {
        throw new Error("Bulk amounts were not inserted properly");
      }
      if (
        data.data.interest_payment_days !== "1, 5, 10, 15, 20, 25, 30" ||
        !Array.isArray(data.data.interest_payment_days_list) ||
        data.data.interest_payment_days_list.length !== 7
      ) {
        throw new Error("Default interest_payment_days was not set correctly");
      }
      planId = data.data.id;
      console.log("   ✅ Create plan with bulk amounts passed, ID:", planId);
      console.log("   Interest payment days default:", data.data.interest_payment_days);
      console.log("   Interest payment days list:", data.data.interest_payment_days_list);
    }

    // 2b. Test interest_payment_days validation and custom array
    console.log("\n2️⃣b Testing interest_payment_days validation & custom arrays...");
    {
      // Invalid day (out of range 1-31)
      const { req, res } = createMockReqRes({
        body: {
          plan_name: "TEST Invalid Days Plan",
          plan_start_date: "2026-10-01",
          plan_end_date: "2027-10-01",
          interest_payment_days: [0, 15, 35],
        },
      });
      await createMonthlyInvestmentPlan(req, res);
      if (res.getStatusCode() !== 400) {
        throw new Error("Validation should have rejected invalid interest payment days");
      }
      console.log("   ✅ Invalid day rejection passed:", res.getResponse().message);

      // Custom array with sorting & deduplication
      const { req: reqCustom, res: resCustom } = createMockReqRes({
        body: {
          plan_name: "TEST Custom Days Plan",
          plan_start_date: "2026-10-01",
          plan_end_date: "2027-10-01",
          interest_payment_days: [25, 5, 15, 5], // unsorted with duplicate
        },
      });
      await createMonthlyInvestmentPlan(reqCustom, resCustom);
      const customData = resCustom.getResponse();
      if (
        resCustom.getStatusCode() !== 201 ||
        customData.data.interest_payment_days !== "5, 15, 25" ||
        JSON.stringify(customData.data.interest_payment_days_list) !== JSON.stringify([5, 15, 25])
      ) {
        throw new Error("Custom interest_payment_days deduplication/sorting failed");
      }
      console.log("   ✅ Custom array sorted & deduplicated:", customData.data.interest_payment_days);
    }

    // 2c. Test getMonthlyInvestmentPlanOptions
    console.log("\n2️⃣c Testing getMonthlyInvestmentPlanOptions...");
    {
      const { req, res } = createMockReqRes();
      await getMonthlyInvestmentPlanOptions(req, res);
      const data = res.getResponse();
      if (
        res.getStatusCode() !== 200 ||
        data.data.default_interest_payment_days !== "1, 5, 10, 15, 20, 25, 30" ||
        data.data.default_interest_payment_days_list.length !== 7
      ) {
        throw new Error("getMonthlyInvestmentPlanOptions failed");
      }
      console.log("   ✅ getMonthlyInvestmentPlanOptions passed");
    }

    // 3. Test getAllMonthlyInvestmentPlans
    console.log("\n3️⃣ Testing getAllMonthlyInvestmentPlans with filters...");
    {
      // Search filter
      const { req, res } = createMockReqRes({
        query: { search: "TEST Golden Growth" },
      });
      await getAllMonthlyInvestmentPlans(req, res);
      const data = res.getResponse();
      console.log("   Found plans count:", data.count);
      if (res.getStatusCode() !== 200 || data.count === 0) {
        throw new Error("getAllMonthlyInvestmentPlans failed to find created plan");
      }
      if (!Array.isArray(data.data[0].interest_payment_days_list)) {
        throw new Error("interest_payment_days_list missing in getAllMonthlyInvestmentPlans");
      }

      // Filter by interest_payment_day=25
      const { req: reqDay, res: resDay } = createMockReqRes({
        query: { interest_payment_day: "25" },
      });
      await getAllMonthlyInvestmentPlans(reqDay, resDay);
      const dayData = resDay.getResponse();
      if (resDay.getStatusCode() !== 200 || dayData.count < 2) {
        throw new Error("Filtering by interest_payment_day failed");
      }
      console.log("   ✅ getAllMonthlyInvestmentPlans passed with day filter");
    }

    // 4. Test getMonthlyInvestmentPlanById
    console.log("\n4️⃣ Testing getMonthlyInvestmentPlanById...");
    {
      const { req, res } = createMockReqRes({
        params: { id: planId },
      });
      await getMonthlyInvestmentPlanById(req, res);
      const data = res.getResponse();
      if (
        res.getStatusCode() !== 200 ||
        data.data.amounts.length !== 2 ||
        !Array.isArray(data.data.interest_payment_days_list)
      ) {
        throw new Error("getMonthlyInvestmentPlanById failed or amounts/days missing");
      }
      console.log("   Plan Name:", data.data.plan_name);
      console.log("   Plan Status:", data.data.status);
      console.log("   Interest payment days:", data.data.interest_payment_days);
      console.log("   Plan amounts:", data.data.amounts.map((a) => a.principal_amount));
      console.log("   ✅ getMonthlyInvestmentPlanById passed");
    }

    // 5. Test updateMonthlyInvestmentPlan
    console.log("\n5️⃣ Testing updateMonthlyInvestmentPlan...");
    {
      const { req, res } = createMockReqRes({
        params: { id: planId },
        body: {
          description: "Updated description for test plan",
          interest_payment_days: "2, 12, 22",
        },
      });
      await updateMonthlyInvestmentPlan(req, res);
      const data = res.getResponse();
      if (
        res.getStatusCode() !== 200 ||
        data.data.description !== "Updated description for test plan" ||
        data.data.interest_payment_days !== "2, 12, 22" ||
        JSON.stringify(data.data.interest_payment_days_list) !== JSON.stringify([2, 12, 22])
      ) {
        throw new Error("updateMonthlyInvestmentPlan failed to update interest_payment_days");
      }
      console.log("   ✅ updateMonthlyInvestmentPlan passed with new interest_payment_days:", data.data.interest_payment_days);
    }

    // 6. Test toggleMonthlyInvestmentPlanStatus
    console.log("\n6️⃣ Testing toggleMonthlyInvestmentPlanStatus...");
    {
      const { req, res } = createMockReqRes({
        params: { id: planId },
        body: { status: "ACTIVE" },
      });
      await toggleMonthlyInvestmentPlanStatus(req, res);
      const data = res.getResponse();
      if (res.getStatusCode() !== 200 || data.data.status !== "ACTIVE") {
        throw new Error("toggleMonthlyInvestmentPlanStatus failed to set ACTIVE");
      }
      console.log("   New status:", data.data.status);
      console.log("   ✅ toggleMonthlyInvestmentPlanStatus passed");
    }

    // 7. Test createMonthlyInvestmentPlanAmount individually
    console.log("\n7️⃣ Testing createMonthlyInvestmentPlanAmount...");
    let amountId;
    {
      const { req, res } = createMockReqRes({
        body: {
          plan_id: planId,
          principal_amount: 50000,
          minimum_monthly_interest: 1000,
          maximum_monthly_interest: 1500,
          is_active: true,
        },
      });
      await createMonthlyInvestmentPlanAmount(req, res);
      const data = res.getResponse();
      if (res.getStatusCode() !== 201 || !data.success) {
        throw new Error(`createMonthlyInvestmentPlanAmount failed: ${JSON.stringify(data)}`);
      }
      amountId = data.data.id;
      console.log("   Created amount ID:", amountId, "Principal:", data.data.principal_amount);
      console.log("   ✅ createMonthlyInvestmentPlanAmount passed");
    }

    // 8. Test getMonthlyInvestmentPlanAmountsByPlanId
    console.log("\n8️⃣ Testing getMonthlyInvestmentPlanAmountsByPlanId...");
    {
      const { req, res } = createMockReqRes({
        params: { plan_id: planId },
      });
      await getMonthlyInvestmentPlanAmountsByPlanId(req, res);
      const data = res.getResponse();
      if (res.getStatusCode() !== 200 || data.count !== 3) {
        throw new Error(`Expected 3 amounts, got ${data.count}`);
      }
      console.log("   Total amounts for plan:", data.count);
      console.log("   ✅ getMonthlyInvestmentPlanAmountsByPlanId passed");
    }

    // 9. Test getMonthlyInvestmentPlanAmountById
    console.log("\n9️⃣ Testing getMonthlyInvestmentPlanAmountById...");
    {
      const { req, res } = createMockReqRes({
        params: { id: amountId },
      });
      await getMonthlyInvestmentPlanAmountById(req, res);
      const data = res.getResponse();
      if (res.getStatusCode() !== 200 || Number(data.data.principal_amount) !== 50000) {
        throw new Error("getMonthlyInvestmentPlanAmountById failed");
      }
      console.log("   Amount principal:", data.data.principal_amount, "Plan:", data.data.plan_name);
      console.log("   ✅ getMonthlyInvestmentPlanAmountById passed");
    }

    // 10. Test updateMonthlyInvestmentPlanAmount
    console.log("\n🔟 Testing updateMonthlyInvestmentPlanAmount...");
    {
      const { req, res } = createMockReqRes({
        params: { id: amountId },
        body: {
          minimum_monthly_interest: 1100,
          maximum_monthly_interest: 1600,
        },
      });
      await updateMonthlyInvestmentPlanAmount(req, res);
      const data = res.getResponse();
      if (res.getStatusCode() !== 200 || Number(data.data.minimum_monthly_interest) !== 1100) {
        throw new Error("updateMonthlyInvestmentPlanAmount failed");
      }
      console.log("   Updated interest range:", data.data.minimum_monthly_interest, "-", data.data.maximum_monthly_interest);
      console.log("   ✅ updateMonthlyInvestmentPlanAmount passed");
    }

    // 10b. Test restriction when customer subscriptions exist
    console.log("\n🔟b Testing update rejection when customer subscriptions exist...");
    {
      // Clean up any lingering test subscriptions
      await db.query(`DELETE FROM monthly_investment_subscriptions WHERE subscription_no LIKE 'TEST-%'`);

      // Insert mock subscription for plan & amount
      const [subInsert] = await db.query(
        `INSERT INTO monthly_investment_subscriptions (
          subscription_no, customer_id, plan_id, plan_amount_id, quantity,
          principal_amount_per_quantity, total_principal_amount,
          subscription_start_date, subscription_end_date, first_interest_due_date,
          total_interest_months, status
        ) VALUES ('TEST-SUB-01', 1, ?, ?, 1, 50000, 50000, '2026-10-01', '2027-10-01', '2026-11-01', 12, 'ACTIVE')`,
        [planId, amountId]
      );
      const subId = subInsert.insertId;

      // 1. Try updating interest_payment_days in updateMonthlyInvestmentPlan (SHOULD BE BLOCKED)
      const { req: reqPlanDays, res: resPlanDays } = createMockReqRes({
        params: { id: planId },
        body: { interest_payment_days: "5, 10, 20" },
      });
      await updateMonthlyInvestmentPlan(reqPlanDays, resPlanDays);
      if (
        resPlanDays.getStatusCode() !== 400 ||
        resPlanDays.getResponse().code !== "PLAN_HAS_ACTIVE_SUBSCRIPTIONS"
      ) {
        throw new Error("Plan update should have blocked modifying interest_payment_days when subscriptions exist");
      }
      console.log("   ✅ Plan update blocked interest_payment_days:", resPlanDays.getResponse().message);

      // 2. Try updating plan_start_date & plan_end_date in updateMonthlyInvestmentPlan (SHOULD BE BLOCKED)
      const { req: reqPlanDates, res: resPlanDates } = createMockReqRes({
        params: { id: planId },
        body: { plan_start_date: "2026-11-01" },
      });
      await updateMonthlyInvestmentPlan(reqPlanDates, resPlanDates);
      if (
        resPlanDates.getStatusCode() !== 400 ||
        resPlanDates.getResponse().code !== "PLAN_HAS_ACTIVE_SUBSCRIPTIONS"
      ) {
        throw new Error("Plan update should have blocked modifying plan_start_date when subscriptions exist");
      }
      console.log("   ✅ Plan update blocked plan_start_date / plan_end_date:", resPlanDates.getResponse().message);

      // 3. Try updating principal_amount in updateMonthlyInvestmentPlanAmount (SHOULD BE BLOCKED)
      const { req: reqAmtPrincipal, res: resAmtPrincipal } = createMockReqRes({
        params: { id: amountId },
        body: { principal_amount: 60000 },
      });
      await updateMonthlyInvestmentPlanAmount(reqAmtPrincipal, resAmtPrincipal);
      if (
        resAmtPrincipal.getStatusCode() !== 400 ||
        resAmtPrincipal.getResponse().code !== "AMOUNT_HAS_ACTIVE_SUBSCRIPTIONS"
      ) {
        throw new Error("Amount update should have blocked modifying principal_amount when subscriptions exist");
      }
      console.log("   ✅ Amount update blocked principal_amount:", resAmtPrincipal.getResponse().message);

      // 4. Try updating minimum_monthly_interest & maximum_monthly_interest (SHOULD BE BLOCKED)
      const { req: reqAmtInterest, res: resAmtInterest } = createMockReqRes({
        params: { id: amountId },
        body: { minimum_monthly_interest: 1500, maximum_monthly_interest: 2000 },
      });
      await updateMonthlyInvestmentPlanAmount(reqAmtInterest, resAmtInterest);
      if (
        resAmtInterest.getStatusCode() !== 400 ||
        resAmtInterest.getResponse().code !== "AMOUNT_HAS_ACTIVE_SUBSCRIPTIONS"
      ) {
        throw new Error("Amount update should have blocked modifying minimum/maximum monthly interest when subscriptions exist");
      }
      console.log("   ✅ Amount update blocked interest rate changes:", resAmtInterest.getResponse().message);

      // 5. Updating non-financial fields (description on plan, is_active on amount) SHOULD SUCCEED
      const { req: reqPlanAllowed, res: resPlanAllowed } = createMockReqRes({
        params: { id: planId },
        body: { description: "Allowed description update while subscribed" },
      });
      await updateMonthlyInvestmentPlan(reqPlanAllowed, resPlanAllowed);
      if (resPlanAllowed.getStatusCode() !== 200) {
        throw new Error("Plan update should allow non-financial fields like description");
      }
      console.log("   ✅ Non-financial plan updates allowed when subscribed");

      const { req: reqAmtAllowed, res: resAmtAllowed } = createMockReqRes({
        params: { id: amountId },
        body: { is_active: false },
      });
      await updateMonthlyInvestmentPlanAmount(reqAmtAllowed, resAmtAllowed);
      if (resAmtAllowed.getStatusCode() !== 200) {
        throw new Error("Amount update should allow toggling is_active when subscribed");
      }
      console.log("   ✅ Non-financial amount updates (is_active) allowed when subscribed");

      // Clean up mock subscription
      await db.query(`DELETE FROM monthly_investment_subscriptions WHERE id = ?`, [subId]);
    }

    // 10c. Test Full Subscription & Schedule Creation Flow
    console.log("\n🔟c Testing Monthly Investment Subscription & Schedule Generation...");
    let createdSubscriptionId;
    {
      // Ensure plan and amount tier are ACTIVE with standard allowed days
      await db.query(`UPDATE monthly_investment_plans SET status = 'ACTIVE', interest_payment_days = '1, 5, 10, 15, 20, 25, 30' WHERE id = ?`, [planId]);
      await db.query(`UPDATE monthly_investment_plan_amounts SET is_active = true WHERE id = ?`, [amountId]);

      // 1. Test previewMonthlyInvestmentSubscription
      console.log("   --- Testing previewMonthlyInvestmentSubscription ---");
      const { req: reqPreview, res: resPreview } = createMockReqRes({
        query: {
          plan_id: planId,
          plan_amount_id: amountId,
          quantity: 2,
          subscription_start_date: "2026-10-06",
        },
      });
      await previewMonthlyInvestmentSubscription(reqPreview, resPreview);
      const previewData = resPreview.getResponse();
      if (resPreview.getStatusCode() !== 200 || !previewData.success) {
        throw new Error(`Preview failed: ${JSON.stringify(previewData)}`);
      }
      if (previewData.data.first_schedule_date !== "2026-10-10") {
        throw new Error(`Expected first schedule date 2026-10-10, got ${previewData.data.first_schedule_date}`);
      }
      if (previewData.data.subscription_end_date !== "2027-10-01") {
        throw new Error(`Expected subscription_end_date 2027-10-01, got ${previewData.data.subscription_end_date}`);
      }
      console.log("   ✅ Preview passed. First schedule:", previewData.data.first_schedule_date, "Months:", previewData.data.total_interest_months);

      // 2. Test createMonthlyInvestmentSubscription (Only customer_id, plan_id, plan_amount_id provided)
      console.log("   --- Testing createMonthlyInvestmentSubscription ---");
      const { req: reqCreateSub, res: resCreateSub } = createMockReqRes({
        body: {
          customer_id: 1,
          plan_id: planId,
          plan_amount_id: amountId,
          subscription_start_date: "2026-10-06",
          quantity: 1,
        },
      });
      await createMonthlyInvestmentSubscription(reqCreateSub, resCreateSub);
      const subData = resCreateSub.getResponse();
      if (resCreateSub.getStatusCode() !== 201 || !subData.success) {
        throw new Error(`Create subscription failed: ${JSON.stringify(subData)}`);
      }

      createdSubscriptionId = subData.data.id;
      console.log("   ✅ Subscription created ID:", createdSubscriptionId);
      console.log("   Subscription No:", subData.data.subscription_no);
      console.log("   Subscription Start Date:", subData.data.subscription_start_date);
      console.log("   Subscription End Date (from plan):", subData.data.subscription_end_date);
      console.log("   First Interest Due Date:", subData.data.first_interest_due_date);
      console.log("   Total Interest Months:", subData.data.total_interest_months);
      console.log("   Total Interest Amount:", subData.data.total_interest_amount);
      console.log("   Generated Schedules Count:", subData.schedules_count);

      if (!subData.data.subscription_no.startsWith("MIS-")) {
        throw new Error("Subscription number format invalid");
      }
      if (subData.data.first_interest_due_date !== "2026-10-10") {
        throw new Error(`Expected first interest due date 2026-10-10, got ${subData.data.first_interest_due_date}`);
      }
      if (subData.schedules_count <= 0) {
        throw new Error("No schedules generated for subscription");
      }

      // 3. Test getSchedulesBySubscriptionId
      console.log("   --- Testing getSchedulesBySubscriptionId ---");
      const { req: reqGetSched, res: resGetSched } = createMockReqRes({
        params: { subscription_id: createdSubscriptionId },
      });
      await getSchedulesBySubscriptionId(reqGetSched, resGetSched);
      const schedData = resGetSched.getResponse();
      if (resGetSched.getStatusCode() !== 200 || schedData.count !== subData.schedules_count) {
        throw new Error("Failed to retrieve schedules by subscription ID");
      }
      console.log("   ✅ Retrieved", schedData.count, "schedules for subscription");
      console.log("   Schedule 1 due date:", schedData.data[0].interest_due_date, "period:", schedData.data[0].period_start_date, "to", schedData.data[0].period_end_date);

      // 4. Test getAllMonthlyInvestmentSubscriptions
      console.log("   --- Testing getAllMonthlyInvestmentSubscriptions ---");
      const { req: reqAllSubs, res: resAllSubs } = createMockReqRes({
        query: { customer_id: 1, plan_id: planId },
      });
      await getAllMonthlyInvestmentSubscriptions(reqAllSubs, resAllSubs);
      const allSubsData = resAllSubs.getResponse();
      if (resAllSubs.getStatusCode() !== 200 || allSubsData.count === 0) {
        throw new Error("getAllMonthlyInvestmentSubscriptions failed");
      }
      console.log("   ✅ getAllMonthlyInvestmentSubscriptions returned", allSubsData.count, "subscriptions");

      // 5. Test getMonthlyInvestmentSubscriptionById
      console.log("   --- Testing getMonthlyInvestmentSubscriptionById ---");
      const { req: reqSubById, res: resSubById } = createMockReqRes({
        params: { id: createdSubscriptionId },
      });
      await getMonthlyInvestmentSubscriptionById(reqSubById, resSubById);
      const subByIdData = resSubById.getResponse();
      if (resSubById.getStatusCode() !== 200 || !subByIdData.data.schedules) {
        throw new Error("getMonthlyInvestmentSubscriptionById failed");
      }
      console.log("   ✅ getMonthlyInvestmentSubscriptionById passed with customer:", subByIdData.data.customer_name);

      // 6. Test runDailyMonthlyInvestmentMaintenance
      console.log("   --- Testing runDailyMonthlyInvestmentMaintenance ---");
      const { req: reqMaint, res: resMaint } = createMockReqRes();
      await runDailyMonthlyInvestmentMaintenance(reqMaint, resMaint);
      const maintData = resMaint.getResponse();
      if (resMaint.getStatusCode() !== 200) {
        throw new Error("runDailyMonthlyInvestmentMaintenance failed");
      }
      console.log("   ✅ Daily maintenance passed:", maintData.data);

      // 6b. Test Due Payments APIs: Today Due, Overdue, Upcoming, Date Filters, and Summary
      console.log("   --- Testing Due Payments APIs & Date Filters ---");
      {
        // 6b.1 Today Due API
        const { req: reqToday, res: resToday } = createMockReqRes({
          query: { with_stats: "true" },
        });
        await getMonthlyInvestmentDueSchedules(reqToday, resToday, "today");
        const todayData = resToday.getResponse();
        if (resToday.getStatusCode() !== 200 || !todayData.summary) {
          throw new Error("getMonthlyInvestmentDueSchedules (today) failed");
        }
        console.log("   ✅ Today Due API passed. Filter:", todayData.filter_applied, "Count:", todayData.count, "Summary:", todayData.summary);

        // 6b.2 Overdue API
        const { req: reqOverdue, res: resOverdue } = createMockReqRes();
        await getMonthlyInvestmentDueSchedules(reqOverdue, resOverdue, "overdue");
        const overdueData = resOverdue.getResponse();
        if (resOverdue.getStatusCode() !== 200) {
          throw new Error("getMonthlyInvestmentDueSchedules (overdue) failed");
        }
        console.log("   ✅ Overdue API passed. Matched count:", overdueData.count);

        // 6b.3 Upcoming API with limit & customer filter
        const { req: reqUpcoming, res: resUpcoming } = createMockReqRes({
          query: { customer_id: 1, limit: 10 },
        });
        await getMonthlyInvestmentDueSchedules(reqUpcoming, resUpcoming, "upcoming");
        const upcomingData = resUpcoming.getResponse();
        if (resUpcoming.getStatusCode() !== 200 || upcomingData.count === 0) {
          throw new Error("getMonthlyInvestmentDueSchedules (upcoming) failed");
        }
        console.log("   ✅ Upcoming Due API passed. Found schedules:", upcomingData.count, "Total in DB:", upcomingData.total);

        // 6b.4 Date Filter: this_month preset
        const { req: reqMonth, res: resMonth } = createMockReqRes({
          query: { date_filter: "this_month" },
        });
        await getMonthlyInvestmentDueSchedules(reqMonth, resMonth);
        const monthData = resMonth.getResponse();
        if (resMonth.getStatusCode() !== 200) {
          throw new Error("getMonthlyInvestmentDueSchedules (this_month) failed");
        }
        console.log("   ✅ Date Filter 'this_month' passed. Found:", monthData.count);

        // 6b.5 Date Filter: custom date range
        const { req: reqRange, res: resRange } = createMockReqRes({
          query: { from_date: "2026-10-01", to_date: "2027-10-01", search: "dheeran" },
        });
        await getAllMonthlyInvestmentSchedules(reqRange, resRange);
        const rangeData = resRange.getResponse();
        if (resRange.getStatusCode() !== 200 || rangeData.count === 0) {
          throw new Error("getAllMonthlyInvestmentSchedules with range & search failed");
        }
        console.log("   ✅ getAllMonthlyInvestmentSchedules range & search passed. Matched:", rangeData.count, "Customer:", rangeData.data[0].customer_name);

        // 6b.6 Due Summary / Dashboard KPI API
        const { req: reqSumm, res: resSumm } = createMockReqRes();
        await getMonthlyInvestmentDueSummary(reqSumm, resSumm);
        const summData = resSumm.getResponse();
        if (resSumm.getStatusCode() !== 200 || !summData.data?.today || !summData.data?.overdue) {
          throw new Error("getMonthlyInvestmentDueSummary failed");
        }
        console.log("   ✅ Due Summary / KPI API passed:", summData.data);
      }

      // 7. Test getMonthlyInvestmentSubscriptionPreclosurePreview
      console.log("   --- Testing getMonthlyInvestmentSubscriptionPreclosurePreview ---");
      const { req: reqPreviewPreclose, res: resPreviewPreclose } = createMockReqRes({
        params: { id: createdSubscriptionId },
      });
      await getMonthlyInvestmentSubscriptionPreclosurePreview(reqPreviewPreclose, resPreviewPreclose);
      const previewPrecloseData = resPreviewPreclose.getResponse();
      if (resPreviewPreclose.getStatusCode() !== 200 || !previewPrecloseData.data?.close_amount) {
        throw new Error("getMonthlyInvestmentSubscriptionPreclosurePreview failed");
      }
      console.log("   ✅ Preclosure preview passed. Calculated close amount: ₹", previewPrecloseData.data.close_amount,
        "(Principal: ₹" + previewPrecloseData.data.preclosure_principal_amount +
        ", Interest: ₹" + previewPrecloseData.data.preclosure_interest_amount + ")");

      // 8. Test updateMonthlyInvestmentSubscriptionStatus (PRECLOSED) & verify close amount
      console.log("   --- Testing updateMonthlyInvestmentSubscriptionStatus (PRECLOSED) ---");
      const { req: reqStatus, res: resStatus } = createMockReqRes({
        params: { id: createdSubscriptionId },
        body: { status: "PRECLOSED", reason: "Customer relocation" },
      });
      await updateMonthlyInvestmentSubscriptionStatus(reqStatus, resStatus);
      const statusData = resStatus.getResponse();
      if (
        resStatus.getStatusCode() !== 200 ||
        statusData.data.status !== "PRECLOSED" ||
        statusData.close_amount !== 50000 ||
        !statusData.preclosure_summary
      ) {
        throw new Error(`updateMonthlyInvestmentSubscriptionStatus PRECLOSED failed. Got: ${JSON.stringify(statusData)}`);
      }
      console.log("   ✅ Status updated to PRECLOSED! Correct close amount returned: ₹" + statusData.close_amount);
      console.log("      Summary:", statusData.preclosure_summary);

      // 9. Test Payment validation: PRECLOSED subscription CANNOT accept payments
      console.log("   --- Testing payment rejection on PRECLOSED subscription ---");
      {
        const { req: reqPayPreclosed, res: resPayPreclosed } = createMockReqRes({
          body: {
            subscription_id: createdSubscriptionId,
            payment_type: "INTEREST",
            payment_mode: "CASH",
          },
        });
        await processMonthlyInvestmentPayment(reqPayPreclosed, resPayPreclosed);
        const payPreclosedData = resPayPreclosed.getResponse();
        if (resPayPreclosed.getStatusCode() !== 400 || payPreclosedData.code !== "CANNOT_PAY_PRECLOSED_SUBSCRIPTION") {
          throw new Error("Failed to reject payment on PRECLOSED subscription");
        }
        console.log("   ✅ Payment correctly rejected on PRECLOSED subscription:", payPreclosedData.message);
      }

      // 10. Test CANCELLED workflow & validations
      console.log("\n   --- Testing CANCELLED workflow & validations ---");
      // Create a new subscription specifically for cancellation testing
      let cancelSubId;
      {
        const { req: reqNewSub, res: resNewSub } = createMockReqRes({
          body: {
            customer_id: 1,
            plan_id: planId,
            plan_amount_id: amountId,
            quantity: 1,
            subscription_start_date: "2026-10-01",
          },
        });
        await createMonthlyInvestmentSubscription(reqNewSub, resNewSub);
        cancelSubId = resNewSub.getResponse().data.id;
        console.log("   Created fresh subscription for cancellation test, ID:", cancelSubId);
      }

      // Cancel the subscription (no payments have been made)
      {
        const { req: reqCancel, res: resCancel } = createMockReqRes({
          params: { id: cancelSubId },
          body: { status: "CANCELLED", reason: "Customer changed mind before payments" },
        });
        await updateMonthlyInvestmentSubscriptionStatus(reqCancel, resCancel);
        const cancelData = resCancel.getResponse();
        if (resCancel.getStatusCode() !== 200 || cancelData.data.status !== "CANCELLED") {
          throw new Error("Cancellation of subscription failed");
        }
        console.log("   ✅ Subscription cancelled successfully. Cancelled schedules count:", cancelData.cancelled_schedules_count);

        // Verify all schedules are marked CANCELLED
        const [scheds] = await db.query(
          `SELECT COUNT(*) AS active_count FROM monthly_investment_interest_schedules 
           WHERE subscription_id = ? AND status != 'CANCELLED'`,
          [cancelSubId]
        );
        if (scheds[0].active_count !== 0) {
          throw new Error("Expected all schedules to be CANCELLED");
        }
        console.log("   ✅ All interest schedules confirmed CANCELLED");
      }

      // Test Payment validation: CANCELLED subscription CANNOT accept payments
      console.log("   --- Testing payment rejection on CANCELLED subscription ---");
      {
        const { req: reqPayCancelled, res: resPayCancelled } = createMockReqRes({
          body: {
            subscription_id: cancelSubId,
            payment_type: "INTEREST",
            payment_mode: "CASH",
          },
        });
        await processMonthlyInvestmentPayment(reqPayCancelled, resPayCancelled);
        const payCancelledData = resPayCancelled.getResponse();
        if (resPayCancelled.getStatusCode() !== 400 || payCancelledData.code !== "CANNOT_PAY_CANCELLED_SUBSCRIPTION") {
          throw new Error("Failed to reject payment on CANCELLED subscription");
        }
        console.log("   ✅ Payment correctly rejected on CANCELLED subscription:", payCancelledData.message);
      }

      // 11. Test: A subscription with payments CANNOT be cancelled!
      console.log("\n   --- Testing CANCELLED rejection when payments exist ---");
      let paidSubId;
      {
        const { req: reqPaidSub, res: resPaidSub } = createMockReqRes({
          body: {
            customer_id: 1,
            plan_id: planId,
            plan_amount_id: amountId,
            quantity: 1,
            subscription_start_date: "2026-10-01",
          },
        });
        await createMonthlyInvestmentSubscription(reqPaidSub, resPaidSub);
        paidSubId = resPaidSub.getResponse().data.id;
        console.log("   Created fresh subscription for payment test, ID:", paidSubId);

        // Process interest payment for this subscription
        const { req: reqPay, res: resPay } = createMockReqRes({
          body: {
            subscription_id: paidSubId,
            payment_type: "INTEREST",
            payment_mode: "UPI",
            interest_amount: 2000,
            transaction_reference: "UPI-TEST-12345",
          },
        });
        await processMonthlyInvestmentPayment(reqPay, resPay);
        const payData = resPay.getResponse();
        if (resPay.getStatusCode() !== 201 || !payData.success) {
          throw new Error("Processing payment failed: " + JSON.stringify(payData));
        }
        console.log("   ✅ Interest payment of ₹2,000 recorded successfully. Payment ID:", payData.data.payment.id);

        // Now attempt to CANCEL this subscription -> MUST BE REJECTED!
        const { req: reqAttemptCancel, res: resAttemptCancel } = createMockReqRes({
          params: { id: paidSubId },
          body: { status: "CANCELLED", reason: "Attempting to cancel paid subscription" },
        });
        await updateMonthlyInvestmentSubscriptionStatus(reqAttemptCancel, resAttemptCancel);
        const attemptCancelData = resAttemptCancel.getResponse();
        if (resAttemptCancel.getStatusCode() !== 400 || attemptCancelData.code !== "CANNOT_CANCEL_PAID_SUBSCRIPTION") {
          throw new Error("Expected cancellation of paid subscription to fail with CANNOT_CANCEL_PAID_SUBSCRIPTION");
        }
        console.log("   ✅ Cancellation correctly rejected because payment exists:", attemptCancelData.message);

        // Preclose this subscription instead
        const { req: reqPreclosePaid, res: resPreclosePaid } = createMockReqRes({
          params: { id: paidSubId },
          body: { reason: "Preclosing after partial payment" },
        });
        await precloseMonthlyInvestmentSubscription(reqPreclosePaid, resPreclosePaid);
        const preclosePaidData = resPreclosePaid.getResponse();
        if (resPreclosePaid.getStatusCode() !== 200 || preclosePaidData.close_amount !== 50000) {
          throw new Error("Preclosing paid subscription failed");
        }
        console.log("   ✅ Paid subscription successfully preclosed. Close amount returned: ₹" + preclosePaidData.close_amount);

        // Test payment listing
        const { req: reqListPay, res: resListPay } = createMockReqRes({
          query: { subscription_id: paidSubId },
        });
        await getAllMonthlyInvestmentPayments(reqListPay, resListPay);
        const listPayData = resListPay.getResponse();
        if (resListPay.getStatusCode() !== 200 || listPayData.count === 0) {
          throw new Error("Listing payments failed");
        }
        console.log("   ✅ Listed payments for subscription, total count:", listPayData.total);
      }

      // Clean up test subscriptions
      await db.query(`DELETE FROM monthly_investment_payments WHERE subscription_id IN (?, ?, ?)`, [
        createdSubscriptionId,
        cancelSubId,
        paidSubId,
      ]);
      await db.query(`DELETE FROM monthly_investment_interest_schedules WHERE subscription_id IN (?, ?, ?)`, [
        createdSubscriptionId,
        cancelSubId,
        paidSubId,
      ]);
      await db.query(`DELETE FROM monthly_investment_subscriptions WHERE id IN (?, ?, ?)`, [
        createdSubscriptionId,
        cancelSubId,
        paidSubId,
      ]);
      console.log("   ✅ Cleaned up test subscriptions");
    }

    // 11. Test toggleMonthlyInvestmentPlanAmountStatus
    console.log("\n1️⃣1️⃣ Testing toggleMonthlyInvestmentPlanAmountStatus...");
    {
      const { req, res } = createMockReqRes({
        params: { id: amountId },
        body: { is_active: false },
      });
      await toggleMonthlyInvestmentPlanAmountStatus(req, res);
      const data = res.getResponse();
      if (res.getStatusCode() !== 200 || data.data.is_active !== 0) {
        throw new Error("toggleMonthlyInvestmentPlanAmountStatus failed");
      }
      console.log("   New is_active:", data.data.is_active);
      console.log("   ✅ toggleMonthlyInvestmentPlanAmountStatus passed");
    }

    // 12. Test deleteMonthlyInvestmentPlanAmount
    console.log("\n1️⃣2️⃣ Testing deleteMonthlyInvestmentPlanAmount...");
    {
      const { req, res } = createMockReqRes({
        params: { id: amountId },
      });
      await deleteMonthlyInvestmentPlanAmount(req, res);
      const data = res.getResponse();
      if (res.getStatusCode() !== 200 || !data.success) {
        throw new Error("deleteMonthlyInvestmentPlanAmount failed");
      }
      console.log("   Deleted amount ID:", amountId);
      console.log("   ✅ deleteMonthlyInvestmentPlanAmount passed");
    }

    // 13. Test deleteMonthlyInvestmentPlan
    console.log("\n1️⃣3️⃣ Testing deleteMonthlyInvestmentPlan (and cascade of child amounts)...");
    {
      const { req, res } = createMockReqRes({
        params: { id: planId },
      });
      await deleteMonthlyInvestmentPlan(req, res);
      const data = res.getResponse();
      if (res.getStatusCode() !== 200 || !data.success) {
        throw new Error("deleteMonthlyInvestmentPlan failed");
      }
      console.log("   Deleted plan ID:", planId);
      console.log("   ✅ deleteMonthlyInvestmentPlan passed");
    }

    // 14. Check audit logs
    console.log("\n1️⃣4️⃣ Verifying Audit Logs...");
    {
      const [logs] = await db.query(
        `SELECT id, table_name, action, remarks, changed_at 
         FROM audit_logs 
         WHERE table_name IN ('monthly_investment_plans', 'monthly_investment_plan_amounts') 
         ORDER BY id DESC LIMIT 5`
      );
      console.log("   Recent audit logs count:", logs.length);
      for (const log of logs) {
        console.log(`     - [${log.action}] on ${log.table_name}: ${log.remarks}`);
      }
      if (logs.length === 0) {
        throw new Error("No audit logs found for monthly investment operations");
      }
      console.log("   ✅ Audit logs verified");
    }

    console.log("\n🎉 ALL TESTS PASSED SUCCESSFULLY! The monthly investment module is fully operational.");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ TEST FAILED:", error);
    process.exit(1);
  }
};

runTests();
