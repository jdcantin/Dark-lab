import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import express from "express";
import cors from "cors";

// ── Configuration ─────────────────────────────────────────────────────────────
const FIELDPULSE_API_KEY = process.env.FIELDPULSE_API_KEY || "REPLACE_WITH_YOUR_API_KEY";
const BASE_URL = "https://api.fieldpulse.com/v1"; // Update if FieldPulse confirms a different base URL

// ── HTTP helper ───────────────────────────────────────────────────────────────
async function fpRequest(method, path, body = null) {
  const url = `${BASE_URL}${path}`;
  const options = {
    method,
    headers: {
      "Authorization": `Bearer ${FIELDPULSE_API_KEY}`,
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
  };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(url, options);

  if (res.status === 401) throw new Error("Unauthorized — check your FIELDPULSE_API_KEY");
  if (res.status === 429) throw new Error("Rate limit exceeded (1000 req/hr). Please wait before retrying.");
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`FieldPulse API error ${res.status}: ${text}`);
  }
  return res.json();
}

// ── Tool definitions ──────────────────────────────────────────────────────────
const TOOLS = [

  // ── CUSTOMERS ──────────────────────────────────────────────────────────────
  {
    name: "fp_list_customers",
    description: "List all customers in FieldPulse. Supports pagination.",
    inputSchema: {
      type: "object",
      properties: {
        page: { type: "number", description: "Page number (default 1)" },
        limit: { type: "number", description: "Results per page (default 25)" },
        search: { type: "string", description: "Search by name, email, or phone" },
      },
    },
  },
  {
    name: "fp_get_customer",
    description: "Get a single customer by ID.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Customer ID" },
      },
      required: ["id"],
    },
  },
  {
    name: "fp_create_customer",
    description: "Create a new customer in FieldPulse.",
    inputSchema: {
      type: "object",
      properties: {
        first_name: { type: "string" },
        last_name: { type: "string" },
        email: { type: "string" },
        phone: { type: "string" },
        address: { type: "string" },
        city: { type: "string" },
        state: { type: "string" },
        zip: { type: "string" },
        notes: { type: "string" },
      },
      required: ["first_name", "last_name"],
    },
  },
  {
    name: "fp_update_customer",
    description: "Update an existing customer by ID.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Customer ID" },
        first_name: { type: "string" },
        last_name: { type: "string" },
        email: { type: "string" },
        phone: { type: "string" },
        address: { type: "string" },
        city: { type: "string" },
        state: { type: "string" },
        zip: { type: "string" },
        notes: { type: "string" },
      },
      required: ["id"],
    },
  },

  // ── JOBS ───────────────────────────────────────────────────────────────────
  {
    name: "fp_list_jobs",
    description: "List jobs in FieldPulse. Filter by status, customer, or date range.",
    inputSchema: {
      type: "object",
      properties: {
        page: { type: "number" },
        limit: { type: "number" },
        status: { type: "string", description: "e.g. open, closed, scheduled, in_progress" },
        customer_id: { type: "string" },
        start_date: { type: "string", description: "ISO date YYYY-MM-DD" },
        end_date: { type: "string", description: "ISO date YYYY-MM-DD" },
      },
    },
  },
  {
    name: "fp_get_job",
    description: "Get a single job by ID.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Job ID" },
      },
      required: ["id"],
    },
  },
  {
    name: "fp_create_job",
    description: "Create a new job in FieldPulse.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string" },
        customer_id: { type: "string" },
        description: { type: "string" },
        status: { type: "string" },
        scheduled_start: { type: "string", description: "ISO datetime" },
        scheduled_end: { type: "string", description: "ISO datetime" },
        assigned_user_id: { type: "string" },
        address: { type: "string" },
        city: { type: "string" },
        state: { type: "string" },
        zip: { type: "string" },
      },
      required: ["title", "customer_id"],
    },
  },
  {
    name: "fp_update_job",
    description: "Update an existing job by ID.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Job ID" },
        title: { type: "string" },
        status: { type: "string" },
        description: { type: "string" },
        scheduled_start: { type: "string" },
        scheduled_end: { type: "string" },
        assigned_user_id: { type: "string" },
      },
      required: ["id"],
    },
  },

  // ── PROJECTS ───────────────────────────────────────────────────────────────
  {
    name: "fp_list_projects",
    description: "List all projects in FieldPulse.",
    inputSchema: {
      type: "object",
      properties: {
        page: { type: "number" },
        limit: { type: "number" },
        customer_id: { type: "string" },
        status: { type: "string" },
      },
    },
  },
  {
    name: "fp_get_project",
    description: "Get a single project by ID.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Project ID" },
      },
      required: ["id"],
    },
  },
  {
    name: "fp_create_project",
    description: "Create a new project in FieldPulse.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        customer_id: { type: "string" },
        description: { type: "string" },
        status: { type: "string" },
        start_date: { type: "string" },
        end_date: { type: "string" },
      },
      required: ["name", "customer_id"],
    },
  },
  {
    name: "fp_update_project",
    description: "Update a project by ID.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string" },
        name: { type: "string" },
        status: { type: "string" },
        description: { type: "string" },
        start_date: { type: "string" },
        end_date: { type: "string" },
      },
      required: ["id"],
    },
  },

  // ── ESTIMATES ──────────────────────────────────────────────────────────────
  {
    name: "fp_list_estimates",
    description: "List estimates in FieldPulse.",
    inputSchema: {
      type: "object",
      properties: {
        page: { type: "number" },
        limit: { type: "number" },
        customer_id: { type: "string" },
        status: { type: "string" },
      },
    },
  },
  {
    name: "fp_get_estimate",
    description: "Get a single estimate by ID.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string" },
      },
      required: ["id"],
    },
  },
  {
    name: "fp_create_estimate",
    description: "Create a new estimate in FieldPulse.",
    inputSchema: {
      type: "object",
      properties: {
        customer_id: { type: "string" },
        title: { type: "string" },
        line_items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              description: { type: "string" },
              quantity: { type: "number" },
              unit_price: { type: "number" },
            },
          },
        },
        notes: { type: "string" },
      },
      required: ["customer_id", "title"],
    },
  },
  {
    name: "fp_update_estimate",
    description: "Update an estimate by ID.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string" },
        title: { type: "string" },
        status: { type: "string" },
        notes: { type: "string" },
      },
      required: ["id"],
    },
  },

  // ── INVOICES ───────────────────────────────────────────────────────────────
  {
    name: "fp_list_invoices",
    description: "List invoices in FieldPulse.",
    inputSchema: {
      type: "object",
      properties: {
        page: { type: "number" },
        limit: { type: "number" },
        customer_id: { type: "string" },
        status: { type: "string", description: "e.g. draft, sent, paid, overdue" },
      },
    },
  },
  {
    name: "fp_get_invoice",
    description: "Get a single invoice by ID.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string" },
      },
      required: ["id"],
    },
  },
  {
    name: "fp_create_invoice",
    description: "Create a new invoice in FieldPulse.",
    inputSchema: {
      type: "object",
      properties: {
        customer_id: { type: "string" },
        job_id: { type: "string" },
        title: { type: "string" },
        line_items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              description: { type: "string" },
              quantity: { type: "number" },
              unit_price: { type: "number" },
            },
          },
        },
        due_date: { type: "string", description: "ISO date YYYY-MM-DD" },
        notes: { type: "string" },
      },
      required: ["customer_id", "title"],
    },
  },
  {
    name: "fp_update_invoice",
    description: "Update an invoice by ID.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string" },
        status: { type: "string" },
        due_date: { type: "string" },
        notes: { type: "string" },
      },
      required: ["id"],
    },
  },

  // ── TIMESHEETS ─────────────────────────────────────────────────────────────
  {
    name: "fp_list_timesheets",
    description: "List timesheet entries in FieldPulse.",
    inputSchema: {
      type: "object",
      properties: {
        page: { type: "number" },
        limit: { type: "number" },
        user_id: { type: "string" },
        job_id: { type: "string" },
        start_date: { type: "string" },
        end_date: { type: "string" },
      },
    },
  },
  {
    name: "fp_create_timesheet",
    description: "Create a timesheet entry in FieldPulse.",
    inputSchema: {
      type: "object",
      properties: {
        user_id: { type: "string" },
        job_id: { type: "string" },
        clock_in: { type: "string", description: "ISO datetime" },
        clock_out: { type: "string", description: "ISO datetime" },
        notes: { type: "string" },
      },
      required: ["user_id", "clock_in"],
    },
  },
  {
    name: "fp_update_timesheet",
    description: "Update a timesheet entry by ID.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string" },
        clock_in: { type: "string" },
        clock_out: { type: "string" },
        notes: { type: "string" },
      },
      required: ["id"],
    },
  },

  // ── MATERIAL LISTS ─────────────────────────────────────────────────────────
  {
    name: "fp_list_material_lists",
    description: "List material lists in FieldPulse.",
    inputSchema: {
      type: "object",
      properties: {
        page: { type: "number" },
        limit: { type: "number" },
        job_id: { type: "string" },
      },
    },
  },
  {
    name: "fp_create_material_list",
    description: "Create a material list in FieldPulse.",
    inputSchema: {
      type: "object",
      properties: {
        job_id: { type: "string" },
        name: { type: "string" },
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              quantity: { type: "number" },
              unit: { type: "string" },
              notes: { type: "string" },
            },
          },
        },
      },
      required: ["name"],
    },
  },
  {
    name: "fp_update_material_list",
    description: "Update a material list by ID.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string" },
        name: { type: "string" },
        items: { type: "array" },
      },
      required: ["id"],
    },
  },

  // ── PURCHASE ORDERS ────────────────────────────────────────────────────────
  {
    name: "fp_list_purchase_orders",
    description: "List purchase orders in FieldPulse.",
    inputSchema: {
      type: "object",
      properties: {
        page: { type: "number" },
        limit: { type: "number" },
        job_id: { type: "string" },
        status: { type: "string" },
      },
    },
  },
  {
    name: "fp_create_purchase_order",
    description: "Create a purchase order in FieldPulse.",
    inputSchema: {
      type: "object",
      properties: {
        job_id: { type: "string" },
        vendor_id: { type: "string" },
        title: { type: "string" },
        line_items: { type: "array" },
        notes: { type: "string" },
      },
      required: ["title"],
    },
  },

  // ── READ-ONLY LOOKUPS ──────────────────────────────────────────────────────
  {
    name: "fp_list_users",
    description: "List all users/team members in FieldPulse.",
    inputSchema: {
      type: "object",
      properties: {
        page: { type: "number" },
        limit: { type: "number" },
      },
    },
  },
  {
    name: "fp_list_vendors",
    description: "List all vendors in FieldPulse.",
    inputSchema: {
      type: "object",
      properties: {
        page: { type: "number" },
        limit: { type: "number" },
      },
    },
  },
  {
    name: "fp_list_tags",
    description: "List all tags in FieldPulse.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "fp_list_pipeline_statuses",
    description: "List all pipeline statuses in FieldPulse.",
    inputSchema: { type: "object", properties: {} },
  },

  // ── SUBTASKS ───────────────────────────────────────────────────────────────
  {
    name: "fp_list_subtasks",
    description: "List subtasks for a job.",
    inputSchema: {
      type: "object",
      properties: {
        job_id: { type: "string" },
      },
      required: ["job_id"],
    },
  },
  {
    name: "fp_create_subtask",
    description: "Create a subtask on a job.",
    inputSchema: {
      type: "object",
      properties: {
        job_id: { type: "string" },
        title: { type: "string" },
        assigned_user_id: { type: "string" },
        due_date: { type: "string" },
        notes: { type: "string" },
      },
      required: ["job_id", "title"],
    },
  },
  {
    name: "fp_update_subtask",
    description: "Update a subtask by ID.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string" },
        title: { type: "string" },
        status: { type: "string" },
        due_date: { type: "string" },
      },
      required: ["id"],
    },
  },

  // ── COMMENTS ───────────────────────────────────────────────────────────────
  {
    name: "fp_create_comment",
    description: "Add a comment to a job or customer record.",
    inputSchema: {
      type: "object",
      properties: {
        entity_type: { type: "string", description: "job or customer" },
        entity_id: { type: "string" },
        body: { type: "string" },
      },
      required: ["entity_type", "entity_id", "body"],
    },
  },
];

// ── Route tool calls to API endpoints ────────────────────────────────────────
function buildRequest(name, args) {
  const p = (path, q = {}) => {
    const params = Object.entries(q)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join("&");
    return params ? `${path}?${params}` : path;
  };

  switch (name) {
    // Customers
    case "fp_list_customers":    return ["GET",   p("/customers", { page: args.page, limit: args.limit, search: args.search })];
    case "fp_get_customer":      return ["GET",   `/customers/${args.id}`];
    case "fp_create_customer":   return ["POST",  "/customers", args];
    case "fp_update_customer":   return ["PUT",   `/customers/${args.id}`, args];

    // Jobs
    case "fp_list_jobs":         return ["GET",   p("/jobs", { page: args.page, limit: args.limit, status: args.status, customer_id: args.customer_id, start_date: args.start_date, end_date: args.end_date })];
    case "fp_get_job":           return ["GET",   `/jobs/${args.id}`];
    case "fp_create_job":        return ["POST",  "/jobs", args];
    case "fp_update_job":        return ["PUT",   `/jobs/${args.id}`, args];

    // Projects
    case "fp_list_projects":     return ["GET",   p("/projects", { page: args.page, limit: args.limit, customer_id: args.customer_id, status: args.status })];
    case "fp_get_project":       return ["GET",   `/projects/${args.id}`];
    case "fp_create_project":    return ["POST",  "/projects", args];
    case "fp_update_project":    return ["PUT",   `/projects/${args.id}`, args];

    // Estimates
    case "fp_list_estimates":    return ["GET",   p("/estimates", { page: args.page, limit: args.limit, customer_id: args.customer_id, status: args.status })];
    case "fp_get_estimate":      return ["GET",   `/estimates/${args.id}`];
    case "fp_create_estimate":   return ["POST",  "/estimates", args];
    case "fp_update_estimate":   return ["PUT",   `/estimates/${args.id}`, args];

    // Invoices
    case "fp_list_invoices":     return ["GET",   p("/invoices", { page: args.page, limit: args.limit, customer_id: args.customer_id, status: args.status })];
    case "fp_get_invoice":       return ["GET",   `/invoices/${args.id}`];
    case "fp_create_invoice":    return ["POST",  "/invoices", args];
    case "fp_update_invoice":    return ["PUT",   `/invoices/${args.id}`, args];

    // Timesheets
    case "fp_list_timesheets":   return ["GET",   p("/timesheets", { page: args.page, limit: args.limit, user_id: args.user_id, job_id: args.job_id, start_date: args.start_date, end_date: args.end_date })];
    case "fp_create_timesheet":  return ["POST",  "/timesheets", args];
    case "fp_update_timesheet":  return ["PUT",   `/timesheets/${args.id}`, args];

    // Material Lists
    case "fp_list_material_lists":   return ["GET",  p("/material-lists", { page: args.page, limit: args.limit, job_id: args.job_id })];
    case "fp_create_material_list":  return ["POST", "/material-lists", args];
    case "fp_update_material_list":  return ["PUT",  `/material-lists/${args.id}`, args];

    // Purchase Orders
    case "fp_list_purchase_orders":  return ["GET",  p("/purchase-orders", { page: args.page, limit: args.limit, job_id: args.job_id, status: args.status })];
    case "fp_create_purchase_order": return ["POST", "/purchase-orders", args];

    // Lookups
    case "fp_list_users":            return ["GET",  p("/users", { page: args.page, limit: args.limit })];
    case "fp_list_vendors":          return ["GET",  p("/vendors", { page: args.page, limit: args.limit })];
    case "fp_list_tags":             return ["GET",  "/tags"];
    case "fp_list_pipeline_statuses":return ["GET",  "/pipeline-statuses"];

    // Subtasks
    case "fp_list_subtasks":     return ["GET",  `/jobs/${args.job_id}/subtasks`];
    case "fp_create_subtask":    return ["POST", `/jobs/${args.job_id}/subtasks`, args];
    case "fp_update_subtask":    return ["PUT",  `/subtasks/${args.id}`, args];

    // Comments
    case "fp_create_comment":    return ["POST", `/${args.entity_type}s/${args.entity_id}/comments`, { body: args.body }];

    default: throw new Error(`Unknown tool: ${name}`);
  }
}

// ── MCP Server setup ──────────────────────────────────────────────────────────
const server = new Server(
  { name: "fieldpulse-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    const [method, path, body] = buildRequest(name, args || {});
    const data = await fpRequest(method, path, body);
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  } catch (err) {
    return {
      content: [{ type: "text", text: `Error: ${err.message}` }],
      isError: true,
    };
  }
});

// ── Start — dual mode: SSE (Railway/cloud) or stdio (local) ──────────────────
const USE_SSE = process.env.MCP_TRANSPORT === "sse" || process.env.PORT;

if (USE_SSE) {
  // ── HTTP + SSE mode for Railway and other cloud hosts ──
  const PORT = parseInt(process.env.PORT || "3000", 10);
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Health check — Railway uses this to confirm the service is up
  app.get("/health", (_req, res) => res.json({ status: "ok", service: "fieldpulse-mcp" }));

  // SSE endpoint — MCP clients connect here
  const transports = new Map();

  app.get("/sse", async (req, res) => {
    const transport = new SSEServerTransport("/messages", res);
    transports.set(transport.sessionId, transport);
    res.on("close", () => transports.delete(transport.sessionId));

    const sseServer = new Server(
      { name: "fieldpulse-mcp", version: "1.0.0" },
      { capabilities: { tools: {} } }
    );
    sseServer.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));
    sseServer.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      try {
        const [method, path, body] = buildRequest(name, args || {});
        const data = await fpRequest(method, path, body);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return { content: [{ type: "text", text: `Error: ${err.message}` }], isError: true };
      }
    });

    await sseServer.connect(transport);
    console.log(`[SSE] Client connected — session ${transport.sessionId}`);
  });

  // Message endpoint — MCP clients POST tool calls here
  app.post("/messages", async (req, res) => {
    const sessionId = req.query.sessionId;
    const transport = transports.get(sessionId);
    if (!transport) {
      return res.status(404).json({ error: "Session not found" });
    }
    await transport.handlePostMessage(req, res);
  });

  app.listen(PORT, () => {
    console.log(`FieldPulse MCP server (SSE) listening on port ${PORT}`);
    console.log(`  Health: http://localhost:${PORT}/health`);
    console.log(`  SSE:    http://localhost:${PORT}/sse`);
  });

} else {
  // ── stdio mode for local use with Claude Desktop / Claude Code ──
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("FieldPulse MCP server running (stdio)");
}
