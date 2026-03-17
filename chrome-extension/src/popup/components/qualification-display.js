/**
 * Qualification Display Component
 * Handles displaying qualification results in the popup
 */

class QualificationDisplay {
    constructor() {
        this.els = {};
    }

    init() {
        this.cacheElements();
    }

    cacheElements() {
        this.els = {
            qualStatus: document.getElementById('qualStatus'),
            qualResult: document.getElementById('qualResult'),
            qualBadge: document.getElementById('qualBadge'),
            qualScore: document.getElementById('qualScore'),
            qualReason: document.getElementById('qualReason'),
            qualDept: document.getElementById('deptName'),
            qualKeywords: document.getElementById('keywordsList'),
            qualSection: document.getElementById('qualificationSection')
        };
    }

    display(result) {
        this.cacheElements();
        
        if (this.els.qualStatus) this.els.qualStatus.style.display = 'none';
        if (this.els.qualResult) this.els.qualResult.style.display = 'block';
        
        const disposition = result.suggestedDisposition || result.suggested_disposition || 'New';
        const score = result.qualificationScore || result.qualification_score || 0;
        const summary = result.summary || result.salesforceNotes || '';
        const dept = result.recommendedDepartment || result.recommended_department || '-';
        const tags = result.tags || [];
        const phone = result.phone || '';
        const notes = result.salesforceNotes || result.summary || '';
        
        const badgeClass = score >= 70 ? 'hot' : score >= 40 ? 'warm' : 'cold';
        
        if (this.els.qualBadge) {
            this.els.qualBadge.textContent = disposition;
            this.els.qualBadge.className = 'qual-badge ' + badgeClass;
        }
        
        if (this.els.qualScore) {
            this.els.qualScore.textContent = `Score: ${score}%`;
            this.els.qualScore.className = 'qual-score ' + (score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low');
        }
        
        if (this.els.qualReason) this.els.qualReason.textContent = summary || 'No summary available';
        if (this.els.qualDept) this.els.qualDept.textContent = dept;
        
        this.renderKeywords(tags);
        this.addNotesSection(result, phone, summary, tags, notes);
        
        if (this.els.qualSection) {
            this.els.qualSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    renderKeywords(tags) {
        if (!this.els.qualKeywords) return;
        
        this.els.qualKeywords.innerHTML = '';
        if (tags.length > 0) {
            tags.slice(0, 8).forEach(tag => {
                const span = document.createElement('span');
                span.className = 'keyword-tag';
                span.textContent = tag;
                this.els.qualKeywords.appendChild(span);
            });
        } else {
            this.els.qualKeywords.innerHTML = '<span class="keyword-tag">None</span>';
        }
    }

    addNotesSection(result, phone, summary, tags, notes) {
        let notesSection = document.getElementById('copyNotesSection');
        if (!notesSection) {
            notesSection = this.createNotesSection();
        }
        
        const notesContent = document.getElementById('notesContent');
        if (notesContent) {
            notesContent.textContent = this.formatNotes(result, phone, summary, tags, notes);
        }
    }

    createNotesSection() {
        const notesSection = document.createElement('div');
        notesSection.id = 'copyNotesSection';
        notesSection.className = 'section';
        notesSection.style.marginTop = '12px';
        
        const notesTitle = document.createElement('div');
        notesTitle.className = 'section-title';
        notesTitle.textContent = '📋 Notes (Copy-Paste Ready)';
        notesSection.appendChild(notesTitle);
        
        const notesContent = document.createElement('div');
        notesContent.id = 'notesContent';
        notesContent.className = 'notes-content';
        notesContent.style.cssText = 'background: #f5f5f5; padding: 10px; border-radius: 6px; font-size: 12px; white-space: pre-wrap; max-height: 150px; overflow-y: auto;';
        notesSection.appendChild(notesContent);
        
        const copyBtn = document.createElement('button');
        copyBtn.id = 'copyNotesBtn';
        copyBtn.className = 'btn';
        copyBtn.style.cssText = 'width: 100%; margin-top: 8px;';
        copyBtn.textContent = '📋 Copy Notes';
        copyBtn.onclick = () => this.copyNotes(copyBtn);
        notesSection.appendChild(copyBtn);
        
        if (this.els.qualSection) {
            this.els.qualSection.parentNode.insertBefore(notesSection, this.els.qualSection.nextSibling);
        }
        
        return notesSection;
    }

    copyNotes(btn) {
        const noteText = document.getElementById('notesContent')?.textContent || '';
        navigator.clipboard.writeText(noteText).then(() => {
            btn.textContent = '✅ Copied!';
            setTimeout(() => btn.textContent = '📋 Copy Notes', 2000);
        });
    }

    formatNotes(result, phone, summary, tags, notes) {
        return `Phone: ${phone}
State: ${result.detectedState || result.detected_state || '-'}
Insurance: ${result.detectedInsurance || result.detected_insurance || '-'}
Tags: ${tags.join(', ')}

Summary: ${summary}

Salesforce Notes: ${notes}`;
    }
}

// Export
if (typeof window !== 'undefined') {
    window.QualificationDisplay = QualificationDisplay;
}
