// All site content lives here. Edit this file; the page renders from it.
// TODO: every project, metric, and job below is a PLACEHOLDER. Replace with your real work
// before publishing. Recruiters will ask about the numbers.
window.PORTFOLIO = {
  name: "San Visal",
  handle: "visal",
  role: "Backend Developer",
  tagline: "Building APIs that don't wake you up at 3am.",
  location: "Phnom Penh, Cambodia",

  about: {
    bio: [
      "I design and run the parts of software nobody sees: APIs, data pipelines, queues, and the infrastructure that keeps them up.",
      "I care about boring reliability: clear contracts, good observability, and systems that degrade gracefully instead of falling over.",
    ],
    focus: ["API design", "databases", "observability"],
    open_to_work: true,
    years_experience: 3,
  },

  projects: [
    {
      id: "neakhatka",
      name: "neakhatka",
      version: "main",
      status: "running", // running | building | archived
      summary:
        "Internship marketplace connecting students and recent graduates with companies across Cambodia.",
      problem:
        "Students had no single place to find internships, and companies had no simple way to post roles and manage applicants. The platform had to serve two user types with separate auth, profiles, and file uploads without turning into one tangled server.",
      architecture: [
        "Browser",
        "Next.js",
        "API Gateway",
        "Auth / Profile / Company",
        "RabbitMQ",
        "Notification",
        "MongoDB",
      ],
      stack: [
        "TypeScript",
        "Node.js",
        "Express",
        "MongoDB",
        "RabbitMQ",
        "Docker",
        "AWS",
        "Terraform",
      ],
      metrics: [
        { label: "services", value: "5 + app" },
        { label: "auth", value: "RS256 JWT" },
        { label: "IaC", value: "Terraform" },
      ],
      results: [
        "Split the backend into 5 Express microservices behind one API gateway; the browser only talks to the gateway",
        "JWTs signed by auth-service (RS256) and verified once at the gateway with the public key, plus per-visitor rate limiting",
        "Verification and password-reset emails sent asynchronously via RabbitMQ to a notification service",
        "Typed controllers with tsoa generate Swagger/OpenAPI specs for every service",
        "Jest unit tests per service + in-memory MongoDB integration tests, run in GitHub Actions CI",
        "Infrastructure as code: Terraform for EC2/IAM/S3, PM2 for processes, SST deploys the frontend to AWS",
      ],
      links: { repo: "https://github.com/SANVISAL/HatKaJob", demo: "" },
    },
    {
      id: "asset-manager",
      name: "asset-manager",
      version: "main",
      status: "running",
      summary:
        "Google Sheets add-on that tracks company devices (laptops, phones, monitors) and who is holding them, with a live dashboard.",
      problem:
        "Devices were tracked in a spreadsheet with two lists, assets and staff, that drifted out of sync. Nobody could quickly see who held what, what was free, or what had been handed around before, and every change had to be edited in two places by hand.",
      architecture: [
        "Browser",
        "Dashboard",
        "Asset Manager",
        "Google Sheets",
        "History",
      ],
      stack: [
        "JavaScript",
        "Google Apps Script",
        "Google Sheets",
        "HTML / CSS",
        "Chart.js",
        "clasp",
      ],
      metrics: [
        { label: "platform", value: "Apps Script" },
        { label: "statuses", value: "6" },
        { label: "deploy", value: "clasp" },
      ],
      results: [
        "Dashboard inside the sheet or as a full-screen web app: KPIs and charts by type, department and condition, plus search, staff view and light/dark theme",
        "Assign, return and change status from the dashboard; devices move between the USING and stock areas of the sheet automatically",
        "Two-way sync: typing an asset ID in the Staffs sheet assigns the device, and the asset list rewrites the staff ID columns and checkboxes",
        "Every assign / return / status change is written to a History sheet with who did it, and each device keeps its full list of previous holders",
        "Alerts for free devices, pending checks, repairs, unknown holders, status conflicts, old devices and missing info",
        "Web app runs as the accessing user, so only people with access to the sheet can see the data; code is pushed and versioned with clasp",
      ],
      links: { repo: "https://github.com/SANVISAL/Asset_Management", demo: "" },
    },
  ],

  stack: [
    {
      group: "languages",
      items: [
        ["TypeScript / Node.js", "daily"],
        ["Python", "scripts · data"],
        ["SQL", "always"],
      ],
    },
    {
      group: "databases",
      items: [
        ["PostgreSQL", "prod"],
        ["Redis", "prod"],
        ["MongoDB", "prod"],
        ["ClickHouse", "analytics"],
      ],
    },
    {
      group: "messaging",
      items: [
        ["Kafka", "streams"],
        ["RabbitMQ", "jobs"],
        ["gRPC", "service-to-service"],
      ],
    },
    {
      group: "cloud · devops",
      items: [
        ["Docker", "daily"],
        ["Kubernetes", "prod"],
        ["AWS", "EC2 · RDS · S3"],
        ["GitHub Actions", "CI/CD"],
        ["Terraform", "IaC"],
      ],
    },
  ],

  experience: [
    {
      hash: "a1f3c9e",
      date: "2026 — present",
      type: "feat",
      role: "IT Support and Software Development",
      org: "Aqualife Cambodia",
      points: ["Built internal System for supporting daily working "],
    },
    {
      hash: "7c2e01b",
      date: "May 2025 — 2026",
      type: "feat",
      role: "Developer",
      org: "First Gen Net.co,ltd",
      points: ["Built mini system for support to company daily work"],
    },
    {
      hash: "0d9b4f2",
      date: "2020 — 2024",
      type: "init",
      role: "B.Sc. Computer Science",
      org: "ROYAL UNIVERSITY OF PHNOM PENH",
      points: [
        "Thesis on consistency trade-offs in distributed key-value stores",
      ],
    },
  ],

  contact: {
    email: "sanvisal2302@gmail.com", // TODO: your email
    github: "https://github.com/SANVISAL",
    // linkedin: "https://www.linkedin.com/in/your-handle",
  },
};
