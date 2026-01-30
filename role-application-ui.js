/**
 * Role Application UI - JavaScript Controller
 * Handles role browser, application forms, and API integration
 */

class RoleApplicationUI {
    constructor() {
        this.currentUser = null;
        this.applications = [];
        this.apiBase = '/api';
        this.init();
    }

    async init() {
        await this.loadCurrentUser();
        this.setupEventListeners();
        await this.loadApplications();
    }

    setupEventListeners() {
        // Role card buttons
        document.querySelectorAll('.view-details').forEach(btn => {
            btn.addEventListener('click', () => this.showRoleDetails(btn.dataset.role));
        });

        document.querySelectorAll('.apply-btn').forEach(btn => {
            btn.addEventListener('click', () => this.openApplicationForm(btn.dataset.role));
        });

        // Modal management
        document.querySelector('.close-modal')?.addEventListener('click', () => this.closeModals());
        document.getElementById('detailsModal')?.addEventListener('click', (e) => {
            if (e.target.id === 'detailsModal') this.closeModals();
        });

        // Form submission
        const form = document.getElementById('roleApplicationForm');
        if (form) {
            form.addEventListener('submit', (e) => this.submitApplication(e));
        }

        // Character counter
        const motivation = document.getElementById('motivation');
        if (motivation) {
            motivation.addEventListener('input', (e) => {
                document.getElementById('charCount').textContent = e.target.value.length;
            });
        }
    }

    async loadCurrentUser() {
        try {
            const response = await fetch(`${this.apiBase}/users/profile`);
            if (response.ok) {
                this.currentUser = await response.json();
            }
        } catch (error) {
            console.error('Error loading user:', error);
            this.showNotification('Error loading user profile', 'error');
        }
    }

    async loadApplications() {
        try {
            const response = await fetch(`${this.apiBase}/roles/applications`);
            if (response.ok) {
                this.applications = await response.json();
                this.renderApplicationsList();
            }
        } catch (error) {
            console.error('Error loading applications:', error);
        }
    }

    showRoleDetails(role) {
        const roleDetails = this.getRoleDetailsContent(role);
        const modal = document.getElementById('detailsModal');
        const content = document.getElementById('detailsContent');

        document.getElementById('detailsTitle').textContent = `${roleDetails.name} - Details`;
        content.innerHTML = `
            <div class="role-detail-card">
                <h3>Overview</h3>
                <p>${roleDetails.description}</p>

                <h3>Permissions</h3>
                <ul>
                    ${roleDetails.permissions.map(p => `<li>✓ ${p}</li>`).join('')}
                </ul>

                <h3>Requirements</h3>
                <ul>
                    ${roleDetails.requirements.map(r => `<li>• ${r}</li>`).join('')}
                </ul>

                <h3>Benefits</h3>
                <ul>
                    ${roleDetails.benefits.map(b => `<li>💡 ${b}</li>`).join('')}
                </ul>
            </div>
        `;

        modal.classList.remove('hidden');
    }

    getRoleDetailsContent(role) {
        const roleData = {
            user: {
                name: '👤 User',
                description: 'Basic community member with read-only access',
                permissions: ['Browse Tandas', 'Create Profile', 'View Community'],
                requirements: ['Email verification'],
                benefits: ['Community access']
            },
            verified_user: {
                name: '✅ Verified User',
                description: 'KYC verified member who can participate in Tandas',
                permissions: ['Join Tandas', 'Make Payments', 'Create Wallet', 'View History'],
                requirements: ['Complete KYC', 'Email verified'],
                benefits: ['Full participation', 'Payment access', 'History tracking']
            },
            active_member: {
                name: '⭐ Active Member',
                description: 'Consistent contributor with advanced features',
                permissions: ['Create Tandas', 'Manage Groups', 'Advanced Analytics'],
                requirements: ['5+ successful Tandas', '90+ days activity'],
                benefits: ['Creation rights', 'Group management', 'Advanced tools']
            },
            coordinator: {
                name: '👨‍💼 Coordinator',
                description: 'Tanda group leader with management capabilities',
                permissions: ['Manage Members', 'Set Schedules', 'Dispute Resolution'],
                requirements: ['Active Member role', 'Good reputation score'],
                benefits: ['Group leadership', 'Member management', 'Revenue sharing']
            },
            moderator: {
                name: '🛡️ Moderator',
                description: 'Community guardian maintaining platform integrity',
                permissions: ['Resolve Disputes', 'Enforce Rules', 'Review Complaints'],
                requirements: ['Excellent reputation', 'Community engagement'],
                benefits: ['Compensation', 'Governance voting', 'Status recognition']
            },
            ambassador: {
                name: '🌍 Ambassador',
                description: 'Platform representative and community advocate',
                permissions: ['Marketing Rights', 'Event Organization', 'Content Creation'],
                requirements: ['Active Member', 'Social presence'],
                benefits: ['Marketing tools', 'Event budget', 'Commission structure']
            },
            developer: {
                name: '👨‍💻 Developer',
                description: 'Technical contributor to platform development',
                permissions: ['API Access', 'Build Tools', 'Technical Documentation'],
                requirements: ['Technical skills', 'Project portfolio'],
                benefits: ['API keys', 'Dev resources', 'Revenue sharing']
            },
            super_admin: {
                name: '👑 Super Admin',
                description: 'Platform administrator with full control',
                permissions: ['Full System Control', 'User Management', 'System Configuration'],
                requirements: ['Invitation only'],
                benefits: ['Complete control', 'Strategic decisions']
            }
        };

        return roleData[role] || roleData.user;
    }

    openApplicationForm(role) {
        const modal = document.getElementById('applicationModal');
        const form = document.getElementById('roleApplicationForm');
        const status = document.getElementById('applicationStatus');

        // Reset form
        form.classList.remove('hidden');
        status.classList.add('hidden');
        form.reset();

        const roleDetails = this.getRoleDetailsContent(role);
        document.getElementById('roleTitle').textContent = `Apply for ${roleDetails.name}`;

        // Show eligibility requirements
        const eligibilityList = document.getElementById('eligibilityList');
        eligibilityList.innerHTML = roleDetails.requirements
            .map(req => `<li>${req}</li>`)
            .join('');

        // Store role in form for submission
        form.dataset.targetRole = role;

        modal.classList.remove('hidden');
    }

    async submitApplication(e) {
        e.preventDefault();

        const form = e.target;
        const role = form.dataset.targetRole;
        const motivation = document.getElementById('motivation').value;
        const experience = document.getElementById('experience').value;
        const references = document.getElementById('references').checked;

        if (!motivation.trim()) {
            this.showNotification('Please provide motivation', 'error');
            return;
        }

        try {
            const response = await fetch(`${this.apiBase}/roles/applications`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    target_role: role,
                    motivation,
                    experience,
                    has_references: references,
                    submitted_at: new Date().toISOString()
                })
            });

            if (response.ok) {
                this.showApplicationSuccess();
                await this.loadApplications();
                setTimeout(() => this.closeModals(), 2000);
            } else {
                this.showNotification('Application submission failed', 'error');
            }
        } catch (error) {
            console.error('Error submitting application:', error);
            this.showNotification('Error submitting application', 'error');
        }
    }

    showApplicationSuccess() {
        document.getElementById('roleApplicationForm').classList.add('hidden');
        document.getElementById('applicationStatus').classList.remove('hidden');
        this.showNotification('✅ Application submitted successfully!', 'success');
    }

    renderApplicationsList() {
        const container = document.getElementById('applicationsList');

        if (this.applications.length === 0) {
            container.innerHTML = '<p class="empty-state">No applications yet</p>';
            return;
        }

        container.innerHTML = this.applications
            .map(app => `
                <div class="application-item">
                    <div class="application-info">
                        <div class="app-role">${app.target_role.toUpperCase()}</div>
                        <div class="app-status">Submitted: ${new Date(app.submitted_at).toLocaleDateString()}</div>
                    </div>
                    <span class="status-badge status-${app.status}">${app.status.toUpperCase()}</span>
                </div>
            `)
            .join('');
    }

    closeModals() {
        document.getElementById('applicationModal')?.classList.add('hidden');
        document.getElementById('detailsModal')?.classList.add('hidden');
    }

    showNotification(message, type = 'info') {
        const container = document.getElementById('notificationContainer');
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;

        container.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

// Initialize on document load
document.addEventListener('DOMContentLoaded', () => {
    new RoleApplicationUI();
});
