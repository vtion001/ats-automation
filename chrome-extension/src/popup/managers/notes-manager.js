/**
 * Notes Manager - Handles note creation, editing, deletion, and display
 */

const NotesManager = {
    notes: [],
    maxNotes: 50,
    
    async load(clientId) {
        const key = 'ats_notes_' + clientId;
        return new Promise(resolve => {
            chrome.storage.local.get(key, result => {
                this.notes = result[key] || [];
                this.render();
                resolve(this.notes);
            });
        });
    },
    
    async addNote(text, type = 'manual') {
        if (!text.trim()) return;
        
        const note = {
            id: Date.now(),
            text: text.trim(),
            type: type,
            timestamp: new Date().toISOString(),
            keywords: []
        };
        
        note.keywords = this.detectKeywords(text);
        if (note.keywords.length > 0) {
            note.type = 'keyword';
        }
        
        this.notes.unshift(note);
        if (this.notes.length > this.maxNotes) {
            this.notes = this.notes.slice(0, this.maxNotes);
        }
        
        await this.save();
        this.render();
        
        if (typeof QualificationManager !== 'undefined') {
            QualificationManager.updateFromNotes(this.notes);
        }
        
        return note;
    },
    
    detectKeywords(text) {
        const keywords = [];
        const textLower = text.toLowerCase();
        
        const keywordPatterns = {
            'interested': ['interested', 'want', 'need', 'looking for'],
            'pricing': ['pricing', 'cost', 'price', 'how much', 'expensive'],
            'insurance': ['insurance', 'coverage', 'benefits', 'aetna', 'cigna', 'blue cross'],
            'schedule': ['appointment', 'schedule', 'book', 'meeting', 'when'],
            'family': ['family', 'son', 'daughter', 'husband', 'wife', 'parent'],
            'crisis': ['crisis', 'emergency', 'suicidal', 'danger', 'overdose'],
            'unqualified': ['not interested', 'no thank', 'wrong number']
        };
        
        for (const [category, words] of Object.entries(keywordPatterns)) {
            for (const word of words) {
                if (textLower.includes(word)) {
                    keywords.push(category);
                    break;
                }
            }
        }
        
        return [...new Set(keywords)];
    },
    
    async save() {
        const key = 'ats_notes_' + (document.getElementById('clientSelect')?.value || 'flyland');
        await new Promise(resolve => {
            chrome.storage.local.set({ [key]: this.notes }, resolve);
        });
    },
    
    render() {
        const container = document.getElementById('notesContainer');
        const empty = document.getElementById('notesEmpty');
        const count = document.getElementById('noteCount');
        
        if (!container) return;
        
        count.textContent = this.notes.length;
        
        if (this.notes.length === 0) {
            if (empty) empty.style.display = 'block';
            container.innerHTML = '';
            container.appendChild(empty);
            return;
        }
        
        if (empty) empty.style.display = 'none';
        
        container.innerHTML = this.notes.map((note, index) => `
            <div class="note-item" data-index="${index}">
                <div class="note-content">
                    <span class="note-type ${note.type}">${note.type}</span>
                    <span class="note-text" id="note-text-${index}">${this.escapeHtml(note.text)}</span>
                </div>
                <div class="note-actions">
                    <button class="note-action-btn edit" data-action="edit" data-index="${index}" title="Edit">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                    </button>
                    <button class="note-action-btn delete" data-action="delete" data-index="${index}" title="Delete">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                    </button>
                </div>
                <span class="note-time">${this.formatTime(note.timestamp)}</span>
            </div>
        `).join('');
    },
    
    editNote(index) {
        const textEl = document.getElementById(`note-text-${index}`);
        const note = this.notes[index];
        
        if (!textEl || !note) return;
        
        if (textEl.dataset.editing === 'true') {
            return;
        }
        
        textEl.dataset.originalText = textEl.textContent;
        textEl.dataset.editing = 'true';
        textEl.contentEditable = true;
        textEl.classList.add('editing');
        textEl.focus();
        
        const noteItem = textEl.closest('.note-item');
        const actions = noteItem.querySelector('.note-actions');
        
        actions.innerHTML = `
            <button class="note-action-btn save" data-action="save" data-index="${index}" title="Save">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
            </button>
            <button class="note-action-btn cancel" data-action="cancel" data-index="${index}" title="Cancel">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
        `;
        
        textEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.saveEdit(index);
            } else if (e.key === 'Escape') {
                this.cancelEdit(index);
            }
        });
    },
    
    async saveEdit(index) {
        const textEl = document.getElementById(`note-text-${index}`);
        if (!textEl || !this.notes[index]) return;
        
        const newText = textEl.textContent.trim();
        if (newText && newText !== textEl.dataset.originalText) {
            this.notes[index].text = newText;
            this.notes[index].editedAt = Date.now();
            await this.save();
        }
        
        this.render();
        
        if (typeof QualificationManager !== 'undefined') {
            QualificationManager.updateFromNotes(this.notes);
        }
    },
    
    cancelEdit(index) {
        this.render();
    },
    
    async deleteNote(index) {
        if (confirm('Are you sure you want to delete this note?')) {
            this.notes.splice(index, 1);
            await this.save();
            this.render();
            
            if (typeof QualificationManager !== 'undefined') {
                QualificationManager.updateFromNotes(this.notes);
            }
        }
    },
    
    formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    },
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    
    async clear() {
        this.notes = [];
        await this.save();
        this.render();
    }
};

window.NotesManager = NotesManager;
