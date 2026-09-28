// =========================================================
// DEPLOYMENT INSTRUCTION:
// When deploying the frontend to Vercel or GitHub Pages, 
// change this API_URL to your live API Gateway URL.
// Example: const API_URL = "https://govconnect-gateway.onrender.com";
// =========================================================
const API_URL = "https://ukr-1-3.onrender.com";
let currentActiveApplicationId = null;

// ================================
// Initial Load & Session Restore
// ================================
window.addEventListener("DOMContentLoaded", () => {
    restoreSession();
});

function restoreSession() {
    const token = sessionStorage.getItem("accessToken");
    const citizenId = sessionStorage.getItem("citizenId");
    const role = sessionStorage.getItem("role");

    if (token && citizenId && role) {
        setupUserHeader(citizenId, role);
        routeDashboard(role);
    }
}

function setupUserHeader(userId, role) {
    document.getElementById("displayUserId").textContent = userId;
    const roleBadge = document.getElementById("displayRoleBadge");
    
    roleBadge.textContent = role.toUpperCase().replace("_", " ");
    roleBadge.className = "badge " + (role === "admin" ? "badge-APPROVED" : "badge-SUBMITTED");

    document.getElementById("navUserArea").style.display = "flex";
}

function routeDashboard(role) {
    document.getElementById("loginSection").style.display = "none";

    if (role === "citizen") {
        document.getElementById("citizenDashboardSection").style.display = "block";
        document.getElementById("officerPortalSection").style.display = "none";
        loadCitizenApplications();
    } else {
        document.getElementById("officerPortalSection").style.display = "block";
        document.getElementById("citizenDashboardSection").style.display = "none";
        loadOfficerApplications();
    }
}

// ================================
// Login & Quick Login
// ================================
function onRoleChange() {
    const role = document.getElementById("loginRole").value;
    const idInput = document.getElementById("loginCitizenId");
    if (role === "citizen") {
        idInput.placeholder = "e.g. CIT001";
        if (!idInput.value || idInput.value.startsWith("OFFICER")) idInput.value = "CIT001";
    } else if (role.includes("officer")) {
        idInput.placeholder = "e.g. OFFICER001";
        if (!idInput.value || idInput.value.startsWith("CIT")) idInput.value = "OFFICER001";
    } else {
        idInput.placeholder = "e.g. ADMIN001";
        idInput.value = "ADMIN001";
    }
}

function quickLogin(id, role) {
    document.getElementById("loginCitizenId").value = id;
    document.getElementById("loginRole").value = role;
    login();
}

async function login() {
    const citizenId = document.getElementById("loginCitizenId").value.trim();
    const role = document.getElementById("loginRole").value;

    if (!citizenId) {
        showToast("Please enter a valid Citizen or Officer ID", "error");
        return;
    }

    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ citizenId, role })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Authentication failed");
        }

        sessionStorage.setItem("accessToken", data.token);
        sessionStorage.setItem("citizenId", citizenId);
        sessionStorage.setItem("role", role);

        setupUserHeader(citizenId, role);
        routeDashboard(role);
        showToast(`Welcome back, ${citizenId}!`, "success");

    } catch (error) {
        showToast(error.message, "error");
    }
}

// ================================
// Logout Fix
// ================================
function logout() {
    sessionStorage.removeItem("accessToken");
    sessionStorage.removeItem("citizenId");
    sessionStorage.removeItem("role");

    document.getElementById("navUserArea").style.display = "none";
    document.getElementById("citizenDashboardSection").style.display = "none";
    document.getElementById("officerPortalSection").style.display = "none";
    document.getElementById("loginSection").style.display = "block";

    showToast("Logged out successfully", "info");
}

// ================================
// API Helper
// ================================
async function apiRequest(endpoint, options = {}) {
    const token = sessionStorage.getItem("accessToken");

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {}),
            Authorization: `Bearer ${token}`
        }
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || "API request failed");
    }

    return data;
}

// ================================
// Citizen Portal Actions
// ================================
async function applyForHousing() {
    const citizenId = sessionStorage.getItem("citizenId");
    const name = document.getElementById("name").value.trim();
    const dateOfBirth = document.getElementById("dateOfBirth").value;
    const mobile = document.getElementById("mobile").value.trim();
    const address = document.getElementById("address").value.trim();

    if (!name || !dateOfBirth || !mobile || !address) {
        showToast("Please complete all applicant profile details", "error");
        return;
    }

    try {
        const response = await apiRequest("/api/housing/apply", {
            method: "POST",
            body: JSON.stringify({ citizenId, name, dateOfBirth, mobile, address })
        });

        showToast("Housing application submitted successfully!", "success");
        loadCitizenApplications();
    } catch (error) {
        showToast(error.message, "error");
    }
}

async function loadCitizenApplications() {
    const citizenId = sessionStorage.getItem("citizenId");
    const container = document.getElementById("citizenApplications");

    try {
        const response = await apiRequest(`/api/applications/citizen/${citizenId}`);
        const apps = response.applications || [];

        if (apps.length === 0) {
            container.innerHTML = `<p style="color: var(--text-muted); font-size: 14px;">No applications found. Submit an application above to get started.</p>`;
            return;
        }

        container.innerHTML = apps.map(app => `
            <div class="app-card">
                <div class="app-header">
                    <div>
                        <span class="app-id">${app.applicationId}</span>
                        <span style="font-size: 12px; color: var(--text-muted); margin-left: 12px;">
                            Submitted: ${new Date(app.createdAt).toLocaleString()}
                        </span>
                    </div>
                    <span class="badge badge-${app.status}">${app.status.replace("_", " ")}</span>
                </div>

                <div class="app-details">
                    <div class="detail-item">
                        <span>Applicant Name</span>
                        <strong>${app.citizen.name}</strong>
                    </div>
                    <div class="detail-item">
                        <span>Mobile</span>
                        <strong>${app.citizen.mobile}</strong>
                    </div>
                    <div class="detail-item">
                        <span>Address</span>
                        <strong>${app.citizen.address}</strong>
                    </div>
                </div>

                <div style="margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--border-color);">
                    <span style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">Department Verification Status:</span>
                    <div class="dept-pills">
                        <div class="dept-pill">
                            Housing: <span class="badge badge-${app.departments.housing}">${app.departments.housing}</span>
                        </div>
                        <div class="dept-pill">
                            Income Verification: <span class="badge badge-${app.departments.income}">${app.departments.income}</span>
                        </div>
                        <div class="dept-pill">
                            Land Non-Ownership: <span class="badge badge-${app.departments.land}">${app.departments.land}</span>
                        </div>
                    </div>
                </div>

                ${app.decision ? `
                    <div style="margin-top: 16px; padding: 12px; background: rgba(255,255,255,0.03); border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
                        <span style="font-size: 12px; color: var(--text-muted);">
                            <strong>Officer Decision (${app.decision.by}):</strong> ${app.decision.reason || "No comments provided"}
                        </span>
                    </div>
                ` : ""}
            </div>
        `).join("");

    } catch (error) {
        showToast(error.message, "error");
        container.innerHTML = `<p style="color: var(--danger);">Failed to load applications</p>`;
    }
}

// ================================
// Officer Portal & Decision Flow
// ================================
let currentOfficerApplications = [];

async function loadOfficerApplications() {
    const container = document.getElementById("officerApplications");
    const role = sessionStorage.getItem("role");

    try {
        const response = await apiRequest("/api/officer/applications");
        const apps = response.applications || [];
        currentOfficerApplications = apps;

        // Update stats
        const pending = apps.filter(a => a.status === "UNDER_REVIEW").length;
        const approved = apps.filter(a => a.status === "APPROVED").length;
        const rejected = apps.filter(a => a.status === "REJECTED").length;

        document.getElementById("statPendingCount").textContent = pending;
        document.getElementById("statApprovedCount").textContent = approved;
        document.getElementById("statRejectedCount").textContent = rejected;

        if (apps.length === 0) {
            container.innerHTML = `<p style="color: var(--text-muted); font-size: 14px;">No applications available in queue.</p>`;
            return;
        }

        const canDecision = (role === "housing_officer" || role === "admin");

        container.innerHTML = apps.map(app => `
            <div class="app-card">
                <div class="app-header">
                    <div>
                        <span class="app-id">${app.applicationId}</span>
                        <span style="font-size: 12px; color: var(--text-muted); margin-left: 12px;">
                            Citizen ID: <strong>${app.citizenId}</strong>
                        </span>
                    </div>
                    <span class="badge badge-${app.status}">${app.status.replace("_", " ")}</span>
                </div>

                <div class="app-details">
                    <div class="detail-item">
                        <span>Applicant Name</span>
                        <strong>${app.citizen.name}</strong>
                    </div>
                    <div class="detail-item">
                        <span>Date of Birth</span>
                        <strong>${app.citizen.dateOfBirth}</strong>
                    </div>
                    <div class="detail-item">
                        <span>Mobile</span>
                        <strong>${app.citizen.mobile}</strong>
                    </div>
                    <div class="detail-item">
                        <span>Residential Address</span>
                        <strong>${app.citizen.address}</strong>
                    </div>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border-color);">
                    <div class="dept-pills" style="margin-top: 0;">
                        <div class="dept-pill">
                            Income: <span class="badge badge-${app.departments.income}">${app.departments.income}</span>
                        </div>
                        <div class="dept-pill">
                            Land: <span class="badge badge-${app.departments.land}">${app.departments.land}</span>
                        </div>
                    </div>

                    ${app.status === "UNDER_REVIEW" ? `
                        ${canDecision ? `
                            <button class="btn btn-primary btn-sm" onclick="openDecisionModal('${app.applicationId}')">
                                ⚖️ Review & Decide
                            </button>
                        ` : `
                            <span style="font-size: 12px; color: var(--text-muted);">View Only (Housing Officer Action Required)</span>
                        `}
                    ` : `
                        <span style="font-size: 12px; color: var(--text-muted);">
                            Decided by <strong>${app.decision?.by || "Officer"}</strong> (${app.decision?.status})
                        </span>
                    `}
                </div>
            </div>
        `).join("");

    } catch (error) {
        showToast(error.message, "error");
        container.innerHTML = `<p style="color: var(--danger);">Failed to load application queue.</p>`;
    }
}

// Decision Modal Handlers
function openDecisionModal(applicationId) {
    const app = currentOfficerApplications.find(a => a.applicationId === applicationId);
    if (!app) return;

    currentActiveApplicationId = applicationId;
    const detailsContainer = document.getElementById("modalAppDetails");

    detailsContainer.innerHTML = `
        <div style="background: rgba(11,15,25,0.6); padding: 16px; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
            <div style="font-size: 14px; font-weight: 700; color: var(--primary); margin-bottom: 8px;">${app.applicationId}</div>
            <div style="font-size: 13px; margin-bottom: 4px;">Applicant: <strong>${app.citizen.name}</strong> (ID: ${app.citizenId})</div>
            <div style="font-size: 13px; margin-bottom: 4px;">Address: ${app.citizen.address}</div>
            <div style="font-size: 12px; color: var(--text-muted); margin-top: 8px;">
                Income Dept: <span class="badge badge-${app.departments.income}">${app.departments.income}</span> | 
                Land Dept: <span class="badge badge-${app.departments.land}">${app.departments.land}</span>
            </div>
        </div>
    `;

    document.getElementById("decisionReason").value = "";
    document.getElementById("decisionModal").classList.add("active");
}

function closeDecisionModal() {
    document.getElementById("decisionModal").classList.remove("active");
    currentActiveApplicationId = null;
}

async function submitDecision(decision) {
    if (!currentActiveApplicationId) return;

    const reason = document.getElementById("decisionReason").value.trim();

    try {
        const response = await apiRequest(`/api/officer/applications/${currentActiveApplicationId}/decision`, {
            method: "PATCH",
            body: JSON.stringify({ decision, reason })
        });

        showToast(response.message || `Application ${decision} successfully`, "success");
        closeDecisionModal();
        loadOfficerApplications();

    } catch (error) {
        showToast(error.message, "error");
    }
}

// ================================
// Toast Notifications
// ================================
function showToast(message, type = "info") {
    const container = document.getElementById("toastContainer");
    const toast = document.createElement("div");
    
    const icon = type === "success" ? "✅" : type === "error" ? "⚠️" : "ℹ️";
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = "slideIn 0.3s ease reverse forwards";
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}