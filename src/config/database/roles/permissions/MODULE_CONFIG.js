//  export const MODULE_CONFIG = [
//   {
//     name: "Billing",
//     code: "BILLING",
//     actions: ["VIEW", "CREATE"],
//     children: [
//       {
//         name: "Dashboard",
//         code: "BILLING_DASHBOARD",
//         actions: ["VIEW"]
//       },
//       {
//         name: "Products",
//         code: "BILLING_PRODUCTS",
//         actions: ["VIEW"],
//         children: [
//           {
//             name: "Add Product",
//             code: "BILLING_ADD_PRODUCT",
//             actions: ["VIEW", "CREATE", "EDIT", "DELETE"]
//           },
//           {
//             name: "Brand",
//             code: "BILLING_BRAND",
//             actions: ["VIEW", "CREATE", "EDIT", "DELETE"]
//           },
//           {
//             name: "Categories",
//             code: "BILLING_CATEGORIES",
//             actions: ["VIEW", "CREATE", "EDIT", "DELETE"]
//           },
//           {
//             name: "Quantity",
//             code: "BILLING_QUANTITY",
//             actions: ["VIEW", "CREATE", "EDIT", "DELETE"]
//           }
//         ]
//       },
//       {
//         name: "Accounts",
//         code: "BILLING_ACCOUNTS",
//         actions: ["VIEW"],
//         children: [
//           {
//             name: "Pending List",
//             code: "BILLING_PENDING",
//             actions: ["VIEW", "CREATE", "EDIT", "DELETE"]
//           },
//           {
//             name: "Stock Maintenance",
//             code: "BILLING_STOCK",
//             actions: ["VIEW", "CREATE", "EDIT", "DELETE"]
//           },
//           {
//             name: "Current Stock",
//             code: "BILLING_CURRENT_STOCK",
//             actions: ["VIEW", "EDIT", "DELETE"]
//           }
//         ]
//       },
//       {
//         name: "Customers",
//         code: "BILLING_CUSTOMERS",
//         actions: ["VIEW", "CREATE", "EDIT", "DELETE"]
//       },
//       {
//         name: "Vendors",
//         code: "BILLING_VENDORS",
//         actions: ["VIEW", "CREATE", "EDIT", "DELETE"]
//       },
//       {
//         name: "Report",
//         code: "BILLING_REPORT",
//         actions: ["VIEW"],
//         children: [
//           {
//             name: "Customer Billing Report",
//             code: "BILLING_REPORT_CUSTOMER",
//             actions: ["VIEW", "CREATE", "EDIT", "DELETE", "EXPORT"]
//           },
//           {
//             name: "Product Wise Report",
//             code: "BILLING_REPORT_PRODUCT",
//             actions: ["VIEW", "EXPORT"]
//           },
//           {
//             name: "Daily Sales Report",
//             code: "BILLING_REPORT_DAILY",
//             actions: ["VIEW", "EXPORT"]
//           }
//         ]
//       }
//     ]
//   },

//   {
//     name: "Chitfund",
//     code: "CHIT",
//     actions: ["VIEW", "CREATE", "EDIT", "DELETE"],
//     children: [
//       { name: "Dashboard", code: "CHIT_DASHBOARD", actions: ["VIEW"] },
//       { name: "Chit Plans", code: "CHIT_PLANS", actions: ["VIEW", "CREATE", "EDIT", "DELETE"] },
//       { name: "Chit Customers", code: "CHIT_CUSTOMERS", actions: ["VIEW", "CREATE", "EDIT", "DELETE"] },
//       { name: "Chit Batches", code: "CHIT_BATCHES", actions: ["VIEW", "CREATE", "EDIT", "DELETE"] },
//       { name: "Agent / Staff", code: "CHIT_AGENT", actions: ["VIEW", "CREATE", "EDIT", "DELETE"] },
//       { name: "Assigned user to customer", code: "CHIT_ASSIGN_USER", actions: ["VIEW", "CREATE", "EDIT", "DELETE"] },
//       { name: "Collections", code: "CHIT_COLLECTIONS", actions: ["VIEW", "CREATE"] },
//       {
//         name: "Report",
//         code: "CHIT_REPORT",
//         actions: ["VIEW"],
//         children: [
//           {
//             name: "Customer Report",
//             code: "CHIT_REPORT_CUSTOMER",
//             actions: ["VIEW", "CREATE", "EDIT", "DELETE", "EXPORT"]
//           },
//           {
//             name: "Daily Report",
//             code: "CHIT_REPORT_DAILY",
//             actions: ["VIEW", "EXPORT"]
//           }
//         ]
//       }
//     ]
//   }
// ];

export const MODULE_CONFIG = [
  {
    name: "Billing",
    code: "BILLING",
    actions: ["VIEW", "CREATE"],
    children: [
      {
        name: "Dashboard",
        code: "BILLING_DASHBOARD",
        actions: ["VIEW"]
      },
      {
        name: "Products",
        code: "BILLING_PRODUCTS",
        actions: ["VIEW"],
        children: [
          {
            name: "Add Product",
            code: "BILLING_ADD_PRODUCT",
            actions: ["VIEW", "CREATE", "EDIT", "DELETE"]
          },
          {
            name: "Brand",
            code: "BILLING_BRAND",
            actions: ["VIEW", "CREATE", "EDIT", "DELETE"]
          },
          {
            name: "Categories",
            code: "BILLING_CATEGORIES",
            actions: ["VIEW", "CREATE", "EDIT", "DELETE"]
          },
          {
            name: "Quantity",
            code: "BILLING_QUANTITY",
            actions: ["VIEW", "CREATE", "EDIT", "DELETE"]
          }
        ]
      },
      {
        name: "Accounts",
        code: "BILLING_ACCOUNTS",
        actions: ["VIEW"],
        children: [
          {
            name: "Pending List",
            code: "BILLING_PENDING",
            actions: ["VIEW", "EDIT"]
          },
          {
            name: "Stock Maintenance",
            code: "BILLING_STOCK",
            actions: ["VIEW", "CREATE", "EDIT"]
          },
          {
            name: "Current Stock",
            code: "BILLING_CURRENT_STOCK",
            actions: ["VIEW"]
          }
        ]
      },
      {
        name: "Customers",
        code: "BILLING_CUSTOMERS",
        actions: ["VIEW", "CREATE", "EDIT"]
      },
      {
        name: "Vendors",
        code: "BILLING_VENDORS",
        actions: ["VIEW", "CREATE", "EDIT"]
      },
      {
        name: "Report",
        code: "BILLING_REPORT",
        actions: ["VIEW"],
        children: [
          {
            name: "Customer Billing Report",
            code: "BILLING_REPORT_CUSTOMER",
            actions: ["VIEW","CREATE", "EDIT", "DELETE", "EXPORT"]
          },
          {
            name: "Product Wise Report",
            code: "BILLING_REPORT_PRODUCT",
            actions: ["VIEW", "EXPORT"]
          },
          {
            name: "Daily Sales Report",
            code: "BILLING_REPORT_DAILY",
            actions: ["VIEW", "EXPORT"]
          }
        ]
      }
    ]
  },

  {
    name: "Chitfund",
    code: "CHIT",
    actions: ["VIEW"], // ✅ FIXED
    children: [
      { name: "Dashboard", code: "CHIT_DASHBOARD", actions: ["VIEW"] },
      { name: "Chit Plans", code: "CHIT_PLANS", actions: ["VIEW", "CREATE", "EDIT", "DELETE"] },
      { name: "Chit Customers", code: "CHIT_CUSTOMERS", actions: ["VIEW", "CREATE", "EDIT", "DELETE"] },
      { name: "Chit Batches", code: "CHIT_BATCHES", actions: ["VIEW", "CREATE", "EDIT", "DELETE"] },
      { name: "Agent / Staff", code: "CHIT_AGENT", actions: ["VIEW", "CREATE", "EDIT", "DELETE"] },
      { name: "Assigned user to customer", code: "CHIT_ASSIGN_USER", actions: ["VIEW", "CREATE"] },
      { name: "Collections", code: "CHIT_COLLECTIONS", actions: ["VIEW", "CREATE"] },
      {
        name: "Report",
        code: "CHIT_REPORT",
        actions: ["VIEW"],
        children: [
          {
            name: "Customer Report",
            code: "CHIT_REPORT_CUSTOMER",
            actions: ["VIEW", "EXPORT"]
          },
          {
            name: "Daily Report",
            code: "CHIT_REPORT_DAILY",
            actions: ["VIEW", "EXPORT"]
          }
        ]
      }
    ]
  }
];

