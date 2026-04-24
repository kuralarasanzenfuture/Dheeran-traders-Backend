import db from "../config/db.js";
import { seedCompanyDetails } from "./billing/companyDetails.js";
import { seedCustomers } from "./billing/customer.js";
import { seedEmployees } from "./billing/employee.js";
import { seedTamilNaduRiceBrands } from "./billing/products/brand.js";
import { seedRiceCategories } from "./billing/products/categories.js";
import { seedRiceQuantities } from "./billing/products/quantity.js";
import { seedVendors } from "./billing/vendor.js";
import { seedChitAgentStaff } from "./chit/agentAndStaff.js";
import { seedChitCustomers } from "./chit/customer.js";
import { seedRoles } from "./roles/roles.js";
import { seedEmployeeDetails } from "./user/employeeDetails.js";

export const seed = async () => {
  await seedTamilNaduRiceBrands(db);
  await seedRiceCategories(db);
  await seedRiceQuantities(db);
  await seedEmployees(db);
  await seedCustomers(db);
  await seedVendors(db);
  await seedCompanyDetails(db);

  await seedChitAgentStaff(db);
  await seedChitCustomers(db);

  await seedEmployeeDetails(db);

  await seedRoles(db);
};
