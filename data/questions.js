/*
 * Google Cloud Associate Cloud Engineer (ACE) — Practice Question Bank
 * ---------------------------------------------------------------------
 * Each question object:
 *   {
 *     id:        unique string
 *     domain:    one of DOMAINS keys (1..5)
 *     type:      "single" | "multi"
 *     text:      question stem
 *     options:   [ "A ...", "B ..." ]  (text only, no letter prefix)
 *     answer:    index (single) or array of indices (multi)
 *     explanation: why the answer is correct
 *   }
 *
 * These questions are written in the style of the official ACE sample exam:
 * scenario-based, single best answer or "choose N", vendor-neutral phrasing
 * where possible, and grounded in current Google Cloud services.
 */

const DOMAINS = {
  1: "Setting up a cloud solution environment",
  2: "Planning and configuring a cloud solution",
  3: "Deploying and implementing a cloud solution",
  4: "Ensuring successful operation of a cloud solution",
  5: "Configuring access and security",
};

const EXAMS = [
  {
    id: "exam-1",
    title: "Practice Exam 1 — Core Fundamentals",
    description:
      "A balanced 25-question set covering all five domains. Great for your first full run.",
    minutes: 40,
    questions: [
      {
        id: "e1q1",
        domain: 1,
        type: "single",
        text: "Your company has an existing Google Cloud organization. You need to create a new project for the finance team and ensure its costs are billed to the corporate billing account. What is the correct order of operations?",
        options: [
          "Create the billing account, then create the project and it is linked automatically",
          "Create the project, then link it to the existing corporate billing account",
          "Create the project under a folder; billing is inherited from the folder automatically",
          "Enable the Cloud Billing API in the organization, then projects bill automatically",
        ],
        answer: 1,
        explanation:
          "Projects are not automatically linked to a billing account (and billing is not inherited from folders). You create the project, then explicitly link it to the corporate billing account. This can be done in the Console or with `gcloud billing projects link PROJECT_ID --billing-account=BILLING_ACCOUNT_ID`.",
      },
      {
        id: "e1q2",
        domain: 1,
        type: "single",
        text: "You want to run gcloud commands from your local terminal against a specific project without passing --project each time. Which command sets the active project in your configuration?",
        options: [
          "gcloud projects set-active PROJECT_ID",
          "gcloud config set project PROJECT_ID",
          "gcloud init project PROJECT_ID",
          "gcloud auth set-project PROJECT_ID",
        ],
        answer: 1,
        explanation:
          "`gcloud config set project PROJECT_ID` sets the project property in your active gcloud configuration, so subsequent commands use it by default. `gcloud init` walks you through creating a configuration interactively, but the direct property setter is `gcloud config set`.",
      },
      {
        id: "e1q3",
        domain: 5,
        type: "single",
        text: "A developer needs to view Compute Engine instances in a project but must not be able to start, stop, or modify them. Which predefined IAM role follows the principle of least privilege?",
        options: [
          "roles/compute.admin",
          "roles/compute.instanceAdmin.v1",
          "roles/compute.viewer",
          "roles/viewer",
        ],
        answer: 2,
        explanation:
          "`roles/compute.viewer` grants read-only access to Compute Engine resources. `roles/viewer` (a basic role) is broader than needed, and the two admin roles allow modification. Prefer the narrowest predefined role that meets the requirement.",
      },
      {
        id: "e1q4",
        domain: 2,
        type: "single",
        text: "You need object storage for infrequently accessed backups that will be kept for at least a year, with the lowest cost while still allowing occasional retrieval within milliseconds. Which Cloud Storage class is most appropriate?",
        options: ["Standard", "Nearline", "Coldline", "Archive"],
        answer: 2,
        explanation:
          "Coldline is designed for data accessed less than once a quarter with a 90-day minimum storage duration and low storage cost, while still offering millisecond access. Archive (365-day minimum) is cheapest but intended for data accessed less than once a year. For yearly-retained backups touched occasionally, Coldline balances cost and access.",
      },
      {
        id: "e1q5",
        domain: 3,
        type: "single",
        text: "You must deploy a stateless containerized web API that should scale to zero when idle and scale up automatically on request volume, with no cluster to manage. Which service should you choose?",
        options: [
          "Google Kubernetes Engine (Standard)",
          "Compute Engine managed instance group",
          "Cloud Run",
          "App Engine flexible environment",
        ],
        answer: 2,
        explanation:
          "Cloud Run is a fully managed, serverless platform for stateless containers that scales to zero and scales out with request concurrency, with no cluster to operate. GKE requires cluster management; MIGs don't scale to zero the same way; App Engine flexible keeps at least one instance running.",
      },
      {
        id: "e1q6",
        domain: 5,
        type: "single",
        text: "An application running on a Compute Engine VM needs to read objects from a Cloud Storage bucket. What is the recommended way to grant this access?",
        options: [
          "Embed a service account JSON key file in the application code",
          "Attach a service account to the VM and grant that service account the storage.objectViewer role",
          "Store your personal user credentials on the VM",
          "Make the bucket public so any VM can read it",
        ],
        answer: 1,
        explanation:
          "The recommended pattern is to attach a service account to the VM and grant that account the minimal role (e.g., roles/storage.objectViewer). The VM then obtains short-lived credentials from the metadata server automatically—no key files to manage or leak. Embedding JSON keys or making buckets public are security anti-patterns.",
      },
      {
        id: "e1q7",
        domain: 3,
        type: "single",
        text: "You need to deploy a group of identical Compute Engine VMs that automatically recreate failed instances and can autoscale based on CPU utilization. Which resource do you use?",
        options: [
          "An unmanaged instance group",
          "A managed instance group (MIG) with an instance template",
          "A sole-tenant node group",
          "A set of individually created VMs behind a static IP",
        ],
        answer: 1,
        explanation:
          "A managed instance group uses an instance template to create identical VMs and provides autohealing (recreating failed instances) and autoscaling. Unmanaged instance groups are just collections of arbitrary VMs with no templating, autohealing, or autoscaling.",
      },
      {
        id: "e1q8",
        domain: 2,
        type: "single",
        text: "Your team needs a fully managed relational database that is horizontally scalable, provides strong global consistency, and offers up to 99.999% availability for a mission-critical global application. Which service fits best?",
        options: ["Cloud SQL", "Cloud Spanner", "Firestore", "Bigtable"],
        answer: 1,
        explanation:
          "Cloud Spanner is a fully managed relational database offering horizontal scalability, strong (external) consistency, and up to 99.999% availability with a multi-region configuration—ideal for global, mission-critical workloads. Cloud SQL is regional and vertically scaled; Firestore is a document DB; Bigtable is NoSQL wide-column.",
      },
      {
        id: "e1q9",
        domain: 4,
        type: "single",
        text: "You want to receive an alert when the average CPU utilization of a VM exceeds 80% for 5 minutes. Which Google Cloud service do you configure?",
        options: [
          "Cloud Logging",
          "Cloud Monitoring alerting policy",
          "Cloud Trace",
          "Error Reporting",
        ],
        answer: 1,
        explanation:
          "Cloud Monitoring lets you create alerting policies based on metrics (such as CPU utilization) with conditions and notification channels. Cloud Logging handles logs, Cloud Trace handles latency/distributed tracing, and Error Reporting aggregates application errors.",
      },
      {
        id: "e1q10",
        domain: 3,
        type: "single",
        text: "You need to give a running Compute Engine instance a persistent disk with more space without deleting the VM. What can you do?",
        options: [
          "Persistent disks cannot be resized; recreate the VM",
          "Resize the persistent disk and then extend the file system inside the VM",
          "Only the boot disk can be resized, never data disks",
          "Delete the disk and attach a larger snapshot",
        ],
        answer: 1,
        explanation:
          "Persistent disks can be increased in size while attached and even while the VM is running. After resizing the disk (Console or `gcloud compute disks resize`), you extend the file system inside the guest OS to use the new space. You cannot shrink a persistent disk.",
      },
      {
        id: "e1q11",
        domain: 5,
        type: "multi",
        text: "Which of the following are valid types of IAM roles in Google Cloud? (Choose three.)",
        options: [
          "Basic roles (Owner, Editor, Viewer)",
          "Predefined roles",
          "Custom roles",
          "Anonymous roles",
        ],
        answer: [0, 1, 2],
        explanation:
          "Google Cloud IAM has three role types: basic (primitive) roles—Owner, Editor, Viewer; predefined roles that are service-specific and curated by Google; and custom roles you define with a chosen set of permissions. 'Anonymous roles' is not a role type.",
      },
      {
        id: "e1q12",
        domain: 1,
        type: "single",
        text: "In the Google Cloud resource hierarchy, which is the correct top-to-bottom order?",
        options: [
          "Project → Folder → Organization → Resource",
          "Organization → Folder → Project → Resource",
          "Organization → Project → Folder → Resource",
          "Folder → Organization → Project → Resource",
        ],
        answer: 1,
        explanation:
          "The hierarchy is Organization (root) → Folders (optional, can nest) → Projects → Resources. IAM policies and organization policies set higher in the hierarchy are inherited by everything below.",
      },
      {
        id: "e1q13",
        domain: 2,
        type: "single",
        text: "You are estimating the monthly cost of a proposed architecture before deploying anything. Which tool should you use?",
        options: [
          "Cloud Billing budgets",
          "The Google Cloud Pricing Calculator",
          "Cost Table report",
          "Recommender",
        ],
        answer: 1,
        explanation:
          "The Pricing Calculator lets you model expected usage of services and estimate monthly cost before deployment. Budgets and the Cost Table report track actual/forecasted spend on already-running resources; Recommender suggests optimizations on existing resources.",
      },
      {
        id: "e1q14",
        domain: 3,
        type: "single",
        text: "You want to deploy a containerized application to GKE without managing nodes, node pools, or capacity. Which GKE mode should you use?",
        options: [
          "GKE Standard with node auto-provisioning",
          "GKE Autopilot",
          "GKE on-prem (Anthos)",
          "A single-node zonal cluster",
        ],
        answer: 1,
        explanation:
          "GKE Autopilot is a hands-off mode where Google manages the nodes, scaling, and capacity; you pay for the resources your Pods request. Standard mode still requires you to manage node pools even with auto-provisioning enabled.",
      },
      {
        id: "e1q15",
        domain: 4,
        type: "single",
        text: "You need to create a point-in-time backup of a Compute Engine persistent disk that can be used to restore or clone the disk later, and you want it stored efficiently and geo-redundantly. What do you create?",
        options: [
          "A machine image",
          "A persistent disk snapshot",
          "A custom image only",
          "A local SSD copy",
        ],
        answer: 1,
        explanation:
          "Persistent disk snapshots are incremental point-in-time backups stored redundantly (multi-regional by default) that you can use to restore or create new disks. Machine images capture the whole VM configuration including multiple disks and metadata but the specific ask—disk backup for restore/clone—maps to a snapshot.",
      },
      {
        id: "e1q16",
        domain: 5,
        type: "single",
        text: "You must allow inbound SSH (TCP 22) to VMs tagged 'bastion' from your corporate IP range only. What is the correct approach?",
        options: [
          "Create a VPC firewall rule allowing tcp:22 from the corporate CIDR to targets with network tag 'bastion'",
          "Enable OS Login on all projects",
          "Add a route for tcp:22 to the bastion subnet",
          "Assign the roles/compute.osAdminLogin role to the corporate range",
        ],
        answer: 0,
        explanation:
          "VPC firewall rules control traffic by protocol/port, source (CIDR or tags/service accounts), and target (network tags or service accounts). An ingress allow rule for tcp:22 from the corporate CIDR targeting the 'bastion' tag is correct. Routes direct traffic paths, not access control; OS Login governs SSH key management, not source-IP filtering.",
      },
      {
        id: "e1q17",
        domain: 2,
        type: "single",
        text: "An analytics team needs a serverless, highly scalable data warehouse to run SQL queries over terabytes of data with pay-per-query pricing. Which service should you recommend?",
        options: ["Cloud SQL", "BigQuery", "Dataproc", "Bigtable"],
        answer: 1,
        explanation:
          "BigQuery is Google Cloud's serverless, petabyte-scale data warehouse with standard SQL and on-demand (per-query) or capacity-based pricing. Cloud SQL is OLTP relational; Dataproc is managed Spark/Hadoop; Bigtable is NoSQL for high-throughput operational workloads.",
      },
      {
        id: "e1q18",
        domain: 3,
        type: "single",
        text: "You want to deploy an application from source code to a fully managed platform that automatically handles scaling and versioning, using supported runtimes like Python and Java, without containers. Which service is the best fit?",
        options: [
          "Compute Engine",
          "App Engine standard environment",
          "Cloud Run",
          "GKE",
        ],
        answer: 1,
        explanation:
          "App Engine standard environment runs your code on a fully managed platform with automatic scaling (including to zero for some runtimes), traffic splitting, and built-in versioning, using supported language runtimes—no container image required. Cloud Run needs a container; Compute Engine and GKE require more management.",
      },
      {
        id: "e1q19",
        domain: 1,
        type: "single",
        text: "You want to organize resources for three departments (HR, Finance, Engineering) so that IAM policies and org policies can be applied per department and inherited by that department's projects. What should you create?",
        options: [
          "Three separate billing accounts",
          "Three folders under the organization, each containing that department's projects",
          "Three VPC networks",
          "Three custom roles",
        ],
        answer: 1,
        explanation:
          "Folders group projects and let you apply IAM and organization policies at the folder level, which are then inherited by the projects inside. Billing accounts and VPCs don't provide the policy-inheritance grouping described.",
      },
      {
        id: "e1q20",
        domain: 4,
        type: "single",
        text: "You need to search and analyze logs from many resources, and export a subset of logs to BigQuery for long-term analysis. Which feature do you configure?",
        options: [
          "A Cloud Monitoring dashboard",
          "A Cloud Logging sink with a filter and a BigQuery destination",
          "A Pub/Sub topic subscription",
          "A Cloud Trace export",
        ],
        answer: 1,
        explanation:
          "Cloud Logging log sinks route log entries matching a filter to destinations such as BigQuery, Cloud Storage, or Pub/Sub. A sink with a filter and BigQuery destination is exactly the mechanism for exporting a subset of logs for analysis.",
      },
      {
        id: "e1q21",
        domain: 5,
        type: "single",
        text: "A service account needs to impersonate another service account to obtain short-lived credentials. Which IAM role must be granted on the target service account?",
        options: [
          "roles/iam.serviceAccountUser",
          "roles/iam.serviceAccountTokenCreator",
          "roles/iam.serviceAccountAdmin",
          "roles/owner",
        ],
        answer: 1,
        explanation:
          "`roles/iam.serviceAccountTokenCreator` allows a principal to create short-lived credentials (impersonate) for the target service account. `roles/iam.serviceAccountUser` lets a principal run operations as a service account (e.g., deploy a VM with it) but is not the impersonation/token-minting role.",
      },
      {
        id: "e1q22",
        domain: 3,
        type: "single",
        text: "You need to copy a local directory of files to a Cloud Storage bucket from Cloud Shell. Which command should you use?",
        options: [
          "gcloud storage cp -r ./mydir gs://my-bucket",
          "gcloud compute scp ./mydir gs://my-bucket",
          "bq load gs://my-bucket ./mydir",
          "gcloud storage mount gs://my-bucket ./mydir",
        ],
        answer: 0,
        explanation:
          "`gcloud storage cp -r ./mydir gs://my-bucket` recursively copies a local directory to a bucket (the modern replacement for `gsutil cp -r`). `gcloud compute scp` is for VMs, `bq load` is for BigQuery tables, and there is no `gcloud storage mount` for this task.",
      },
      {
        id: "e1q23",
        domain: 2,
        type: "single",
        text: "You are designing a VPC and need instances in two different subnets (in the same region) to communicate over private IP addresses. What is required?",
        options: [
          "VPC Peering between the subnets",
          "Nothing special—instances in the same VPC can route to each other by default via internal IPs, subject to firewall rules",
          "A Cloud VPN tunnel between subnets",
          "A shared VPC host project",
        ],
        answer: 1,
        explanation:
          "Subnets within the same VPC network can communicate over internal IPs by default (subject to firewall rules); no peering or VPN is needed. VPC Peering connects separate VPC networks, not subnets within one network.",
      },
      {
        id: "e1q24",
        domain: 4,
        type: "single",
        text: "Your organization wants to prevent a project from exceeding a certain number of a specific resource (for example, in-use external IP addresses) in a region. What controls this limit?",
        options: [
          "IAM deny policies",
          "Resource quotas",
          "Organization policy constraints only",
          "Firewall rules",
        ],
        answer: 1,
        explanation:
          "Quotas limit how much of a particular resource a project can use (e.g., number of external IPs, CPUs per region). You can view and request changes to quotas in IAM & Admin → Quotas. Org policies enforce broader governance constraints but the specific per-resource count limit is a quota.",
      },
      {
        id: "e1q25",
        domain: 1,
        type: "single",
        text: "You want to try Google Cloud CLI commands in the browser with credentials and tools preinstalled, without installing anything locally. What should you use?",
        options: [
          "Cloud Shell",
          "Cloud Code for VS Code",
          "The mobile app",
          "A local Docker container",
        ],
        answer: 0,
        explanation:
          "Cloud Shell is a browser-based shell with the gcloud CLI, kubectl, and other tools preinstalled and preauthenticated, plus a persistent home directory. It's ideal for quick CLI work without local installation.",
      },
    ],
  },
  {
    id: "exam-2",
    title: "Practice Exam 2 — Compute, Networking & Deployment",
    description:
      "25 questions weighted toward Domain 2 and Domain 3: choosing and deploying compute, storage, and networking.",
    minutes: 40,
    questions: [
      {
        id: "e2q1",
        domain: 2,
        type: "single",
        text: "You need a NoSQL database for high-throughput, low-latency operational workloads such as time-series or IoT data at massive scale. Which service is designed for this?",
        options: ["Firestore", "Cloud Bigtable", "Cloud SQL", "BigQuery"],
        answer: 1,
        explanation:
          "Cloud Bigtable is a wide-column NoSQL database built for high-throughput, low-latency workloads at massive scale, such as time-series, IoT, and analytics ingestion. Firestore is document-oriented for app data; Cloud SQL is relational; BigQuery is an analytics warehouse.",
      },
      {
        id: "e2q2",
        domain: 3,
        type: "single",
        text: "You want to deploy a container to Cloud Run from an image stored in Artifact Registry using the CLI. Which command is correct?",
        options: [
          "gcloud run deploy my-service --image=REGION-docker.pkg.dev/PROJECT/REPO/IMAGE:tag --region=REGION",
          "gcloud container deploy my-service --image=IMAGE",
          "gcloud app deploy --image=IMAGE",
          "gcloud compute instances create-from-container my-service",
        ],
        answer: 0,
        explanation:
          "`gcloud run deploy SERVICE --image=... --region=...` deploys a container image to Cloud Run. The other commands target different services (App Engine, Compute Engine) or aren't valid for Cloud Run.",
      },
      {
        id: "e2q3",
        domain: 2,
        type: "single",
        text: "A workload is fault-tolerant and can be interrupted at any time (for example, batch rendering). You want to minimize compute cost on Compute Engine. Which option should you choose?",
        options: [
          "Sole-tenant nodes",
          "Spot VMs (preemptible)",
          "Committed use discounts on standard VMs",
          "Local SSDs",
        ],
        answer: 1,
        explanation:
          "Spot VMs (the evolution of preemptible VMs) offer steep discounts in exchange for the possibility of being reclaimed at any time—ideal for fault-tolerant, interruptible batch work. Committed use discounts reduce cost but require a 1- or 3-year commitment for steady-state usage.",
      },
      {
        id: "e2q4",
        domain: 3,
        type: "single",
        text: "You need to distribute global HTTP(S) traffic across backends in multiple regions with a single anycast IP and SSL termination. Which load balancer should you use?",
        options: [
          "Internal passthrough Network Load Balancer",
          "Global external Application Load Balancer",
          "Regional external Network Load Balancer",
          "Internal Application Load Balancer",
        ],
        answer: 1,
        explanation:
          "The global external Application Load Balancer (HTTP(S)) provides a single global anycast IP, cross-region backend distribution, and SSL termination. Network Load Balancers operate at L4 and are regional; internal load balancers don't serve external global traffic.",
      },
      {
        id: "e2q5",
        domain: 2,
        type: "single",
        text: "You need to connect your on-premises data center to a VPC over an encrypted tunnel across the public internet with minimal setup. Which option fits?",
        options: [
          "Dedicated Interconnect",
          "Partner Interconnect",
          "Cloud VPN (HA VPN)",
          "Direct Peering",
        ],
        answer: 2,
        explanation:
          "Cloud VPN (HA VPN) establishes IPsec-encrypted tunnels over the public internet between on-prem and your VPC—quick to set up and cost-effective for moderate bandwidth. Dedicated/Partner Interconnect provide private, high-bandwidth connections but require more provisioning and cost.",
      },
      {
        id: "e2q6",
        domain: 3,
        type: "single",
        text: "You created an instance template and want all new VMs in a managed instance group to use a startup script that installs a web server. Where should the startup script be defined?",
        options: [
          "In the firewall rule",
          "In the instance template's metadata (startup-script)",
          "In the VPC subnet configuration",
          "In the project's billing settings",
        ],
        answer: 1,
        explanation:
          "Startup scripts are provided via instance metadata (key `startup-script` or `startup-script-url`). Defining it in the instance template ensures every VM the MIG creates runs the same provisioning script at boot.",
      },
      {
        id: "e2q7",
        domain: 2,
        type: "single",
        text: "Your application needs a managed MySQL database with automatic backups, replication, and patching, for a regional OLTP workload of modest size. Which service should you choose?",
        options: ["Cloud Spanner", "Cloud SQL for MySQL", "Bigtable", "Firestore"],
        answer: 1,
        explanation:
          "Cloud SQL is the managed relational database service supporting MySQL, PostgreSQL, and SQL Server, with automated backups, replication, and patching—right for regional OLTP workloads. Spanner is for global horizontal scale (and higher cost); Bigtable/Firestore are NoSQL.",
      },
      {
        id: "e2q8",
        domain: 3,
        type: "single",
        text: "You want to run a container on a schedule (for example, nightly) without keeping infrastructure running. Which combination is a common serverless approach?",
        options: [
          "Cloud Scheduler triggering a Cloud Run job",
          "A cron job on a persistent Compute Engine VM",
          "GKE CronJob on an always-on cluster",
          "Manually running the container each night",
        ],
        answer: 0,
        explanation:
          "Cloud Scheduler (managed cron) can trigger a Cloud Run job (or an HTTP endpoint / Pub/Sub) to run containerized work on a schedule with no always-on infrastructure. A VM cron or GKE CronJob works but keeps infrastructure running, which isn't serverless.",
      },
      {
        id: "e2q9",
        domain: 2,
        type: "single",
        text: "You need shared file storage (NFS) that multiple Compute Engine VMs can mount simultaneously. Which managed service should you use?",
        options: ["Cloud Storage", "Filestore", "Persistent Disk", "Local SSD"],
        answer: 1,
        explanation:
          "Filestore provides managed NFS file shares that multiple VMs (and GKE Pods) can mount concurrently. Cloud Storage is object storage (not POSIX file semantics), and persistent disks/local SSDs are block storage generally attached to one VM (read-write).",
      },
      {
        id: "e2q10",
        domain: 3,
        type: "multi",
        text: "Which two commands can you use to authenticate kubectl with a GKE cluster so you can deploy workloads? (Choose two.)",
        options: [
          "gcloud container clusters get-credentials CLUSTER --region REGION",
          "gcloud auth configure-docker",
          "kubectl config use-context (after get-credentials populates kubeconfig)",
          "gcloud compute ssh CLUSTER",
        ],
        answer: [0, 2],
        explanation:
          "`gcloud container clusters get-credentials` fetches cluster credentials and writes a context into your kubeconfig; `kubectl config use-context` then selects that context. `gcloud auth configure-docker` configures Docker auth for registries, and `gcloud compute ssh` connects to a VM, not a cluster API.",
      },
      {
        id: "e2q11",
        domain: 2,
        type: "single",
        text: "You want your VPC to span multiple regions without creating separate networks, and to control IP ranges per region. Which VPC mode should you choose?",
        options: [
          "Auto mode VPC",
          "Custom mode VPC",
          "Legacy network",
          "Default network only",
        ],
        answer: 1,
        explanation:
          "A custom mode VPC lets you define exactly which subnets and IP ranges exist in each region, giving full control. Auto mode automatically creates one subnet per region with predefined ranges. A single VPC already spans regions globally—each subnet is regional.",
      },
      {
        id: "e2q12",
        domain: 3,
        type: "single",
        text: "You need to create a Compute Engine VM in the us-central1-a zone with the machine type e2-medium from the CLI. Which command is correct?",
        options: [
          "gcloud compute instances create my-vm --zone=us-central1-a --machine-type=e2-medium",
          "gcloud compute vms new my-vm --region=us-central1",
          "gcloud vm create my-vm --type=e2-medium",
          "gcloud compute instances add my-vm --zone=us-central1",
        ],
        answer: 0,
        explanation:
          "`gcloud compute instances create NAME --zone=ZONE --machine-type=TYPE` is the correct syntax. VMs are zonal resources, so a zone (not just a region) is required.",
      },
      {
        id: "e2q13",
        domain: 2,
        type: "single",
        text: "You expect steady, predictable 24/7 usage of a specific VM family for the next three years and want the largest sustained cost reduction. Which pricing option should you use?",
        options: [
          "Spot VMs",
          "Sustained use discounts",
          "3-year committed use discount (CUD)",
          "On-demand pricing",
        ],
        answer: 2,
        explanation:
          "Committed use discounts give the deepest savings for steady-state, predictable usage in exchange for a 1- or 3-year commitment. Sustained use discounts apply automatically but are smaller; Spot is for interruptible workloads, not steady 24/7 baselines.",
      },
      {
        id: "e2q13b",
        domain: 3,
        type: "single",
        text: "You need to expose a Deployment in GKE to external internet traffic on a stable IP with L4 load balancing. Which Kubernetes Service type do you use?",
        options: ["ClusterIP", "NodePort", "LoadBalancer", "ExternalName"],
        answer: 2,
        explanation:
          "A Service of type LoadBalancer provisions an external load balancer (a Network Load Balancer by default in GKE) with a stable external IP forwarding to your Pods. ClusterIP is internal-only, NodePort exposes a port on each node, and ExternalName maps to a DNS name.",
      },
      {
        id: "e2q14",
        domain: 2,
        type: "single",
        text: "You need object storage that is served with the lowest latency to users across many continents and can tolerate a regional outage. Which Cloud Storage location type should you choose?",
        options: [
          "Regional bucket",
          "Dual-region bucket",
          "Multi-region bucket",
          "Zonal bucket",
        ],
        answer: 2,
        explanation:
          "A multi-region bucket stores data redundantly across a large geographic area (e.g., US, EU, ASIA), providing high availability and low latency to a broad user base and surviving a regional outage. Dual-region gives redundancy across two specific regions; regional is single-region; there is no zonal bucket.",
      },
      {
        id: "e2q15",
        domain: 3,
        type: "single",
        text: "You want to grant external internet access to VMs that have no external IP address, for outbound updates only. Which service provides this?",
        options: [
          "Cloud NAT",
          "Cloud CDN",
          "Cloud Armor",
          "A public firewall rule",
        ],
        answer: 0,
        explanation:
          "Cloud NAT provides outbound-only internet access for VMs without external IPs (and for GKE nodes), keeping them unreachable from the internet inbound. Cloud CDN caches content, Cloud Armor is a WAF/DDoS service, and firewall rules don't provide address translation.",
      },
      {
        id: "e2q16",
        domain: 3,
        type: "single",
        text: "You need to deploy a second version of an App Engine app and gradually shift 10% of traffic to it to test in production. Which App Engine feature enables this?",
        options: [
          "Blue/green DNS swaps only",
          "Traffic splitting across versions",
          "Instance templates",
          "Cloud Load Balancing backend buckets",
        ],
        answer: 1,
        explanation:
          "App Engine supports deploying multiple versions of a service and splitting traffic between them by percentage (by IP, cookie, or random), enabling canary/gradual rollouts. This is built into App Engine and doesn't require external DNS tricks.",
      },
      {
        id: "e2q17",
        domain: 2,
        type: "single",
        text: "Your team wants a fully managed, serverless document database with real-time synchronization and offline support for a mobile app. Which service should you choose?",
        options: ["Firestore", "Cloud SQL", "Bigtable", "Memorystore"],
        answer: 0,
        explanation:
          "Firestore is a serverless, scalable NoSQL document database with real-time listeners and offline support—well suited to mobile and web apps. Cloud SQL is relational, Bigtable is wide-column, and Memorystore is managed Redis/Memcached caching.",
      },
      {
        id: "e2q18",
        domain: 3,
        type: "single",
        text: "You want to store and manage Docker container images and language packages (npm, Maven) in Google Cloud with fine-grained IAM. Which service should you use?",
        options: [
          "Container Registry (gcr.io) only",
          "Artifact Registry",
          "Cloud Storage buckets",
          "Cloud Source Repositories",
        ],
        answer: 1,
        explanation:
          "Artifact Registry is the recommended service for storing container images and language packages with regional repositories and fine-grained IAM. It supersedes the older Container Registry. Cloud Source Repositories host source code, not artifacts.",
      },
      {
        id: "e2q19",
        domain: 2,
        type: "single",
        text: "You need in-memory caching to reduce database load and improve response times for a web application. Which managed service should you use?",
        options: ["Memorystore", "Filestore", "Cloud SQL read replicas", "Bigtable"],
        answer: 0,
        explanation:
          "Memorystore provides managed Redis and Memcached for in-memory caching, reducing backend/database load and latency. Read replicas help scale reads but aren't an in-memory cache; Filestore is NFS; Bigtable is a NoSQL database.",
      },
      {
        id: "e2q20",
        domain: 3,
        type: "single",
        text: "You need to reserve a static external IP address so that a service keeps the same public IP even if the VM is recreated. What should you do?",
        options: [
          "Use the default ephemeral IP; it never changes",
          "Reserve a static external IP address and assign it to the resource",
          "Add an alias IP range",
          "Enable Private Google Access",
        ],
        answer: 1,
        explanation:
          "Reserving a static external IP address gives you a stable public IP you can assign (and reassign) to resources, surviving VM recreation. Ephemeral IPs can change when a VM stops/starts. Alias IP ranges and Private Google Access address different needs.",
      },
      {
        id: "e2q21",
        domain: 2,
        type: "single",
        text: "Two separate VPC networks (in different projects) need to communicate over internal IPs without traversing the internet, with no transitive routing. Which feature enables this?",
        options: [
          "Cloud VPN",
          "VPC Network Peering",
          "Shared VPC",
          "Cloud Interconnect",
        ],
        answer: 1,
        explanation:
          "VPC Network Peering connects two VPC networks so resources communicate using internal IPs, without an external path, and it is non-transitive. Shared VPC is a different model where projects share one host network; VPN/Interconnect connect to on-prem.",
      },
      {
        id: "e2q22",
        domain: 3,
        type: "single",
        text: "You created a VM without an external IP but it needs to reach Google APIs (like Cloud Storage) over internal routing. What must you enable on the subnet?",
        options: [
          "Cloud NAT",
          "Private Google Access",
          "A public firewall rule",
          "Alias IP ranges",
        ],
        answer: 1,
        explanation:
          "Private Google Access lets VMs without external IPs reach Google APIs and services using internal routing. Cloud NAT provides general outbound internet access; Private Google Access specifically targets Google APIs/services.",
      },
      {
        id: "e2q23",
        domain: 2,
        type: "single",
        text: "You are choosing between Cloud Run and GKE for a small team that wants to deploy several stateless microservices with minimal operational overhead and per-request scaling. Which is generally the better default?",
        options: [
          "GKE Standard, for maximum control",
          "Cloud Run, for minimal ops and request-based autoscaling",
          "Compute Engine MIGs",
          "App Engine flexible with custom runtimes",
        ],
        answer: 1,
        explanation:
          "For stateless microservices where a small team wants minimal operational overhead and automatic per-request scaling (including to zero), Cloud Run is the better default. GKE offers more control but adds cluster operations the team must manage.",
      },
      {
        id: "e2q24",
        domain: 3,
        type: "single",
        text: "You want to roll out a new instance template to a managed instance group gradually, replacing instances a few at a time while keeping the service available. Which MIG feature do you use?",
        options: [
          "Rolling update (with maxSurge/maxUnavailable settings)",
          "Delete and recreate the MIG",
          "A single restart of all instances",
          "Change the firewall rule",
        ],
        answer: 0,
        explanation:
          "Managed instance groups support rolling updates: you set a new template and control maxSurge and maxUnavailable so instances are replaced gradually with no full outage. This enables canary and progressive rollouts without recreating the group.",
      },
      {
        id: "e2q25",
        domain: 2,
        type: "single",
        text: "You must estimate and control spend so the team is notified as costs approach a threshold, without automatically stopping resources. What should you configure?",
        options: [
          "A Cloud Billing budget with alert thresholds",
          "A hard quota of $0",
          "An org policy that disables billing",
          "A firewall rule",
        ],
        answer: 0,
        explanation:
          "A Cloud Billing budget with alert thresholds (e.g., 50%, 90%, 100%) sends notifications as spend approaches the budget. Budgets alert but do not by themselves stop resources (that requires additional automation via Pub/Sub). This meets 'notify but don't auto-stop.'",
      },
    ],
  },
  {
    id: "exam-3",
    title: "Practice Exam 3 — Security, IAM & Operations",
    description:
      "25 questions weighted toward Domain 4 and Domain 5: IAM, service accounts, monitoring, logging, and operations.",
    minutes: 40,
    questions: [
      {
        id: "e3q1",
        domain: 5,
        type: "single",
        text: "You want to grant the entire 'developers' Google Group read access to a specific Cloud Storage bucket, following least privilege. What should you do?",
        options: [
          "Grant roles/storage.objectViewer on the bucket to the group principal group:developers@example.com",
          "Grant roles/owner on the project to each developer",
          "Make the bucket public",
          "Grant roles/editor on the project to the group",
        ],
        answer: 0,
        explanation:
          "Grant the narrowly scoped role (roles/storage.objectViewer) at the bucket level to the group principal (group:...). Managing access via groups scales well and least privilege avoids project-wide Owner/Editor grants or making the bucket public.",
      },
      {
        id: "e3q2",
        domain: 5,
        type: "single",
        text: "A contractor should be able to deploy Cloud Functions but should not be able to change IAM policies or billing. Which approach is best?",
        options: [
          "Grant roles/owner",
          "Grant the predefined roles/cloudfunctions.developer role only",
          "Grant roles/editor",
          "Add them as a billing administrator",
        ],
        answer: 1,
        explanation:
          "Grant the specific predefined role for the task (roles/cloudfunctions.developer) so the contractor can deploy functions without the broad powers of Owner/Editor (which include IAM changes) or billing roles. This follows least privilege.",
      },
      {
        id: "e3q3",
        domain: 4,
        type: "single",
        text: "You need to view CPU, disk, and network metrics for your VMs and build a dashboard. Which service provides this out of the box?",
        options: [
          "Cloud Logging",
          "Cloud Monitoring",
          "Cloud Trace",
          "Cloud Profiler",
        ],
        answer: 1,
        explanation:
          "Cloud Monitoring collects metrics (CPU, disk, network, custom metrics) and lets you build dashboards and alerting policies. The Ops Agent can add memory and additional guest metrics. Logging handles logs; Trace/Profiler handle latency/performance profiling.",
      },
      {
        id: "e3q4",
        domain: 5,
        type: "single",
        text: "Your security team wants a record of who did what and when in your Google Cloud project (for example, who deleted a firewall rule). Which logs should you review?",
        options: [
          "VPC Flow Logs",
          "Cloud Audit Logs (Admin Activity)",
          "Application logs only",
          "Load balancer logs",
        ],
        answer: 1,
        explanation:
          "Cloud Audit Logs—specifically Admin Activity logs—record administrative actions (who did what, when) such as changing configuration or deleting resources. Admin Activity logs are always on. VPC Flow Logs capture network flows, not admin actions.",
      },
      {
        id: "e3q5",
        domain: 5,
        type: "single",
        text: "You need to store a database password so applications can retrieve it securely with IAM-controlled access and versioning. Which service should you use?",
        options: [
          "A plaintext file in Cloud Storage",
          "Secret Manager",
          "VM metadata",
          "Environment variables committed to source control",
        ],
        answer: 1,
        explanation:
          "Secret Manager stores secrets (API keys, passwords, certificates) encrypted at rest, with versioning and fine-grained IAM for access. Storing secrets in plaintext files, VM metadata, or source control is insecure.",
      },
      {
        id: "e3q6",
        domain: 4,
        type: "single",
        text: "To collect memory utilization and custom application metrics from a Compute Engine VM into Cloud Monitoring, what should you install?",
        options: [
          "The Ops Agent",
          "Nothing—memory metrics are collected by default",
          "A firewall rule",
          "The gcloud CLI",
        ],
        answer: 0,
        explanation:
          "By default, Cloud Monitoring collects CPU, disk, and network metrics for VMs, but memory and many guest/application metrics require the Ops Agent (which unifies logging and monitoring agents). Installing the Ops Agent enables memory and custom metrics.",
      },
      {
        id: "e3q7",
        domain: 5,
        type: "single",
        text: "You want to enforce that no Compute Engine VM in the organization can have an external IP address. Which mechanism enforces this org-wide?",
        options: [
          "A firewall rule",
          "An Organization Policy constraint (constraints/compute.vmExternalIpAccess)",
          "A custom IAM role",
          "A quota of zero external IPs",
        ],
        answer: 1,
        explanation:
          "Organization Policy constraints, such as constraints/compute.vmExternalIpAccess, enforce governance rules like disallowing external IPs across the org/folder/project hierarchy. IAM controls who can act; org policies control what configurations are allowed.",
      },
      {
        id: "e3q8",
        domain: 5,
        type: "single",
        text: "A principal has roles/editor at the project level but you added an IAM deny policy blocking storage.buckets.delete. What is the effective result for deleting buckets?",
        options: [
          "They can delete buckets because Editor allows it",
          "They cannot delete buckets because deny policies take precedence over allow grants",
          "The deny is ignored for basic roles",
          "It depends on the billing account",
        ],
        answer: 1,
        explanation:
          "IAM deny policies are evaluated before allow policies and take precedence: a matching deny rule blocks the permission even if an allow grant (like Editor) would otherwise permit it. So bucket deletion is denied.",
      },
      {
        id: "e3q9",
        domain: 4,
        type: "single",
        text: "An application is throwing intermittent 500 errors. You want to see aggregated, deduplicated error occurrences with stack traces and trends. Which service should you use?",
        options: [
          "Error Reporting",
          "Cloud Monitoring uptime checks",
          "Cloud Trace",
          "VPC Flow Logs",
        ],
        answer: 0,
        explanation:
          "Error Reporting automatically groups and counts errors from your logs, showing stack traces, first/last seen, and trends. Uptime checks probe availability, Trace measures latency, and Flow Logs capture network data.",
      },
      {
        id: "e3q10",
        domain: 5,
        type: "single",
        text: "You need to create a custom IAM role containing exactly three permissions and assign it at the project level. Which statement is true about custom roles?",
        options: [
          "Custom roles can only be created at the organization level",
          "Custom roles can be created at the organization or project level and contain a curated set of permissions",
          "Custom roles are identical to basic roles",
          "Custom roles cannot be edited after creation",
        ],
        answer: 1,
        explanation:
          "Custom roles can be defined at the organization or project level and include a specific set of permissions you choose, supporting least privilege. They can be updated over time and are ideal when no predefined role fits exactly.",
      },
      {
        id: "e3q11",
        domain: 4,
        type: "single",
        text: "You want to verify that your public website is reachable from multiple global locations and get alerted if it goes down. What should you configure?",
        options: [
          "A Cloud Monitoring uptime check with an alerting policy",
          "A Cloud Logging sink",
          "A firewall rule",
          "A snapshot schedule",
        ],
        answer: 0,
        explanation:
          "Cloud Monitoring uptime checks probe your endpoint from multiple global locations at intervals; pairing an uptime check with an alerting policy notifies you when it fails. Logging sinks route logs, not availability probes.",
      },
      {
        id: "e3q12",
        domain: 5,
        type: "single",
        text: "You want to allow a user to attach a specific service account to a VM they create (run the VM as that service account) but not to manage the service account itself. Which role should you grant on the service account?",
        options: [
          "roles/iam.serviceAccountUser",
          "roles/iam.serviceAccountAdmin",
          "roles/owner",
          "roles/iam.serviceAccountKeyAdmin",
        ],
        answer: 0,
        explanation:
          "roles/iam.serviceAccountUser lets a principal use (act as) a service account—for example, deploy a VM that runs as it—without permission to manage or modify the service account. Admin/KeyAdmin roles grant management capabilities beyond what's needed.",
      },
      {
        id: "e3q13",
        domain: 4,
        type: "single",
        text: "You need long-term, cheaper retention of audit logs beyond the default retention period for compliance. What is a recommended approach?",
        options: [
          "Increase VM disk size",
          "Create a Cloud Logging sink exporting logs to a Cloud Storage bucket (or BigQuery) for retention",
          "Turn off audit logs to save space",
          "Store logs in VM metadata",
        ],
        answer: 1,
        explanation:
          "To retain logs beyond default retention, create a log sink that exports matching log entries to Cloud Storage (cheap long-term storage) or BigQuery (for analysis). This is the standard pattern for compliance retention.",
      },
      {
        id: "e3q14",
        domain: 5,
        type: "single",
        text: "You suspect a leaked service account key. What is the immediate remediation to stop the key from being used?",
        options: [
          "Rotate the project ID",
          "Disable or delete the compromised service account key",
          "Change the billing account",
          "Delete the VPC",
        ],
        answer: 1,
        explanation:
          "The immediate step is to disable or delete the compromised key so it can no longer authenticate, then investigate and rotate credentials. Better long-term, avoid downloaded keys entirely by using attached service accounts / Workload Identity.",
      },
      {
        id: "e3q15",
        domain: 4,
        type: "single",
        text: "You want to automate daily snapshots of a persistent disk for backup and retention. What should you configure?",
        options: [
          "A snapshot schedule (resource policy) attached to the disk",
          "A firewall rule",
          "A Cloud Scheduler job that SSHes into the VM",
          "Manual snapshots each day",
        ],
        answer: 0,
        explanation:
          "Snapshot schedules (a type of resource policy) automate periodic persistent disk snapshots with retention rules—you attach the schedule to the disk. This is the managed, reliable way to automate backups without manual work or custom scripts.",
      },
      {
        id: "e3q16",
        domain: 5,
        type: "multi",
        text: "Which of the following are best practices for managing service accounts? (Choose two.)",
        options: [
          "Grant the minimum necessary roles to each service account",
          "Reuse one highly privileged service account for all workloads",
          "Prefer attached service accounts / Workload Identity over downloaded keys",
          "Commit service account keys to your Git repository for convenience",
        ],
        answer: [0, 2],
        explanation:
          "Best practices: grant least privilege to each service account and avoid downloaded keys by using attached service accounts or Workload Identity (which provide short-lived, automatically rotated credentials). Sharing one over-privileged account or committing keys to source control are anti-patterns.",
      },
      {
        id: "e3q17",
        domain: 4,
        type: "single",
        text: "Your team wants to reduce noise by only being paged for critical alerts while lower-severity issues go to email. In Cloud Monitoring, what do you configure to route notifications?",
        options: [
          "Notification channels attached to alerting policies",
          "A single global email address for everything",
          "A firewall rule per severity",
          "IAM roles",
        ],
        answer: 0,
        explanation:
          "In Cloud Monitoring you define notification channels (email, SMS, PagerDuty, Slack, Pub/Sub, etc.) and attach the appropriate channels to each alerting policy, letting you route critical vs. low-severity alerts differently.",
      },
      {
        id: "e3q18",
        domain: 5,
        type: "single",
        text: "You want centralized management of SSH access to Linux VMs using IAM (so you don't manually manage keys per instance). What should you enable?",
        options: [
          "OS Login",
          "A shared private key stored in a bucket",
          "Password authentication",
          "A single project-wide SSH key committed to source control",
        ],
        answer: 0,
        explanation:
          "OS Login ties SSH access to IAM identities and centralizes key management, so you grant/revoke access via IAM roles (e.g., roles/compute.osLogin) instead of managing metadata keys per VM. This improves security and manageability.",
      },
      {
        id: "e3q19",
        domain: 4,
        type: "single",
        text: "Which command shows the IAM policy currently bound to a project so you can audit who has which roles?",
        options: [
          "gcloud projects get-iam-policy PROJECT_ID",
          "gcloud iam roles list",
          "gcloud config list",
          "gcloud projects describe PROJECT_ID --billing",
        ],
        answer: 0,
        explanation:
          "`gcloud projects get-iam-policy PROJECT_ID` returns the project's IAM policy (bindings of members to roles), which you use to audit access. `gcloud iam roles list` lists role definitions, not who is bound to them.",
      },
      {
        id: "e3q20",
        domain: 5,
        type: "single",
        text: "You want data at rest in a Cloud Storage bucket encrypted with keys that you manage and can rotate/disable in Cloud KMS. Which option should you use?",
        options: [
          "Google-managed encryption keys (default)",
          "Customer-managed encryption keys (CMEK) with Cloud KMS",
          "No encryption",
          "Client-side base64 encoding",
        ],
        answer: 1,
        explanation:
          "Customer-managed encryption keys (CMEK) let you control encryption keys in Cloud KMS—rotating, disabling, or destroying them—while Google handles the encryption operations. All data is encrypted at rest by default with Google-managed keys, but CMEK gives you control.",
      },
      {
        id: "e3q21",
        domain: 4,
        type: "single",
        text: "You need to correlate slow requests with the specific microservice calls that caused the latency in a distributed application. Which service should you use?",
        options: ["Cloud Trace", "Cloud Logging", "Error Reporting", "Cloud NAT"],
        answer: 0,
        explanation:
          "Cloud Trace captures latency data and distributed traces across services, letting you see where time is spent in a request path. Logging captures log entries, Error Reporting aggregates errors, and Cloud NAT is networking.",
      },
      {
        id: "e3q22",
        domain: 5,
        type: "single",
        text: "A user reports they cannot create a VM even though they have roles/compute.viewer. What is the most likely cause?",
        options: [
          "compute.viewer is read-only and lacks permission to create instances; they need a role like compute.instanceAdmin.v1",
          "The project has no billing—unrelated",
          "They must be an Owner of the organization",
          "The VPC is missing",
        ],
        answer: 0,
        explanation:
          "roles/compute.viewer grants read-only access. Creating VMs requires write permissions such as those in roles/compute.instanceAdmin.v1 (plus the ability to act as the VM's service account). Grant an appropriate role that includes compute.instances.create.",
      },
      {
        id: "e3q23",
        domain: 4,
        type: "single",
        text: "You want a single pane to view logs across all projects in a folder for a security investigation. Which capability helps aggregate logs centrally?",
        options: [
          "An aggregated log sink at the folder/organization level routing to a central log bucket or BigQuery",
          "Copying logs manually from each project",
          "VM local log files",
          "Snapshots",
        ],
        answer: 0,
        explanation:
          "Aggregated sinks defined at the folder or organization level can route logs from all included projects to a central destination (log bucket, BigQuery, Cloud Storage, or Pub/Sub), enabling centralized analysis without per-project manual work.",
      },
      {
        id: "e3q24",
        domain: 5,
        type: "single",
        text: "Which principle should guide how you assign IAM roles across your organization?",
        options: [
          "Grant Owner broadly to avoid access tickets",
          "Least privilege: grant only the permissions needed to perform a task",
          "Always use basic roles instead of predefined roles",
          "Assign roles to individual users rather than groups",
        ],
        answer: 1,
        explanation:
          "Least privilege—granting only the minimum permissions required—is the guiding IAM principle. Prefer predefined/custom roles over broad basic roles, and manage access via groups for scalability rather than per-user grants.",
      },
      {
        id: "e3q25",
        domain: 4,
        type: "single",
        text: "You want to be notified via Pub/Sub when a billing budget threshold is exceeded so automation can react. What must you attach to the budget?",
        options: [
          "A Pub/Sub topic as the budget's notification target",
          "A firewall rule",
          "A snapshot schedule",
          "A custom IAM role",
        ],
        answer: 0,
        explanation:
          "Cloud Billing budgets can publish threshold notifications to a Pub/Sub topic, enabling programmatic responses (e.g., a Cloud Function that disables billing or scales down resources). Email alerts notify humans; Pub/Sub enables automation.",
      },
    ],
  },
];

// Expose to browser and (optionally) Node
if (typeof window !== "undefined") {
  window.ACE_DATA = { DOMAINS, EXAMS };
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = { DOMAINS, EXAMS };
}
