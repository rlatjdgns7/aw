// Configuration
const API_BASE_URL = 'https://us-central1-foodism-782cb.cloudfunctions.net/api';

// State
let currentTab = 'additives';
let editingItem = null;
let additives = [];
let recipes = [];

// DOM Elements
const tabButtons = document.querySelectorAll('.tab-button');
const tabContents = document.querySelectorAll('.tab-content');
const addAdditiveBtn = document.getElementById('add-additive-btn');
const addRecipeBtn = document.getElementById('add-recipe-btn');
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modal-title');
const closeModal = document.getElementById('close-modal');
const cancelBtn = document.getElementById('cancel-btn');
const itemForm = document.getElementById('item-form');
const additiveForm = document.getElementById('additive-form');
const recipeForm = document.getElementById('recipe-form');
const additivesList = document.getElementById('additives-list');
const recipesList = document.getElementById('recipes-list');
const loading = document.getElementById('loading');
const notification = document.getElementById('notification');
const additiveImageInput = document.getElementById('additive-image');
const recipeImageInput = document.getElementById('recipe-image');
const additiveImagePreview = document.getElementById('additive-image-preview');
const recipeImagePreview = document.getElementById('recipe-image-preview');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    loadData();
});

// Event Listeners
function setupEventListeners() {
    // Tab switching
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tab = button.dataset.tab;
            switchTab(tab);
        });
    });

    // Add buttons
    addAdditiveBtn.addEventListener('click', () => openModal('additive'));
    addRecipeBtn.addEventListener('click', () => openModal('recipe'));

    // Modal controls
    closeModal.addEventListener('click', closeModalHandler);
    cancelBtn.addEventListener('click', closeModalHandler);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModalHandler();
    });

    // Form submission
    itemForm.addEventListener('submit', handleSubmit);
    
    // Image upload handlers
    additiveImageInput.addEventListener('change', (e) => handleImagePreview(e, additiveImagePreview));
    recipeImageInput.addEventListener('change', (e) => handleImagePreview(e, recipeImagePreview));

    // ESC key to close modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('show')) {
            closeModalHandler();
        }
    });
}

// Tab Management
function switchTab(tab) {
    currentTab = tab;

    // Update tab buttons
    tabButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });

    // Update tab contents
    tabContents.forEach(content => {
        content.classList.toggle('active', content.id === `${tab}-tab`);
    });

    // Load data if needed
    loadData();
}

// Data Loading
async function loadData() {
    showLoading(true);
    
    try {
        if (currentTab === 'additives' && additives.length === 0) {
            await loadAdditives();
        } else if (currentTab === 'recipes' && recipes.length === 0) {
            await loadRecipes();
        }
        renderCurrentTab();
    } catch (error) {
        showNotification('데이터를 불러오는데 실패했습니다.', 'error');
        console.error('Data loading error:', error);
    } finally {
        showLoading(false);
    }
}

async function loadAdditives() {
    const response = await fetch(`${API_BASE_URL}/admin/additives`);
    if (!response.ok) throw new Error('Failed to load additives');
    
    const data = await response.json();
    additives = data.data || [];
}

async function loadRecipes() {
    const response = await fetch(`${API_BASE_URL}/admin/recipes`);
    if (!response.ok) throw new Error('Failed to load recipes');
    
    const data = await response.json();
    recipes = data.data || [];
}

// Rendering
function renderCurrentTab() {
    if (currentTab === 'additives') {
        renderAdditives();
    } else {
        renderRecipes();
    }
}

function renderAdditives() {
    if (additives.length === 0) {
        additivesList.innerHTML = '<div class="empty-state">등록된 첨가물이 없습니다.</div>';
        return;
    }

    additivesList.innerHTML = additives.map(additive => `
        <div class="item-card">
            ${additive.image_url ? `<div class="item-image"><img src="${escapeHtml(additive.image_url)}" alt="${escapeHtml(additive.name)}" style="width: 100%; max-height: 150px; object-fit: cover; border-radius: 8px; margin-bottom: 10px;"></div>` : ''}
            <div class="item-header">
                <div class="item-name">${escapeHtml(additive.name)}</div>
                <div class="hazard-badge ${additive.hazard_level}">
                    ${getHazardText(additive.hazard_level)}
                </div>
            </div>
            <div class="item-description">${escapeHtml(additive.description_short)}</div>
            ${additive.aliases && additive.aliases.length > 0 ? 
                `<div class="item-aliases">별명: ${additive.aliases.map(alias => escapeHtml(alias)).join(', ')}</div>` : ''
            }
            <div class="action-buttons">
                <button class="action-button edit-button" onclick="editAdditive('${additive.id}')">
                    수정
                </button>
                <button class="action-button delete-button" onclick="deleteAdditive('${additive.id}')">
                    삭제
                </button>
            </div>
        </div>
    `).join('');
}

function renderRecipes() {
    if (recipes.length === 0) {
        recipesList.innerHTML = '<div class="empty-state">등록된 레시피가 없습니다.</div>';
        return;
    }

    recipesList.innerHTML = recipes.map(recipe => `
        <div class="item-card">
            ${recipe.image_url ? `<div class="item-image"><img src="${escapeHtml(recipe.image_url)}" alt="${escapeHtml(recipe.title)}" style="width: 100%; max-height: 150px; object-fit: cover; border-radius: 8px; margin-bottom: 10px;"></div>` : ''}
            <div class="item-name">${escapeHtml(recipe.title)}</div>
            <div class="item-url">
                <a href="${escapeHtml(recipe.youtube_url)}" target="_blank" rel="noopener noreferrer">
                    ${escapeHtml(recipe.youtube_url)}
                </a>
            </div>
            <div class="action-buttons">
                <button class="action-button edit-button" onclick="editRecipe('${recipe.id}')">
                    수정
                </button>
                <button class="action-button delete-button" onclick="deleteRecipe('${recipe.id}')">
                    삭제
                </button>
            </div>
        </div>
    `).join('');
}

// Modal Management
function openModal(type, item = null) {
    editingItem = item;
    
    if (type === 'additive') {
        modalTitle.textContent = item ? '첨가물 수정' : '첨가물 추가';
        additiveForm.style.display = 'block';
        recipeForm.style.display = 'none';
        
        if (item) {
            document.getElementById('name').value = item.name || '';
            document.querySelector(`input[name="hazard_level"][value="${item.hazard_level}"]`).checked = true;
            document.getElementById('description_short').value = item.description_short || '';
            document.getElementById('description_full').value = item.description_full || '';
            document.getElementById('aliases').value = item.aliases ? item.aliases.join(', ') : '';
        } else {
            itemForm.reset();
            document.querySelector('input[name="hazard_level"][value="medium"]').checked = true;
        }
    } else {
        modalTitle.textContent = item ? '레시피 수정' : '레시피 추가';
        additiveForm.style.display = 'none';
        recipeForm.style.display = 'block';
        
        if (item) {
            document.getElementById('title').value = item.title || '';
            document.getElementById('youtube_url').value = item.youtube_url || '';
        } else {
            itemForm.reset();
        }
    }
    
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

function closeModalHandler() {
    modal.classList.remove('show');
    document.body.style.overflow = '';
    editingItem = null;
    itemForm.reset();
    // Clear image previews
    additiveImagePreview.innerHTML = '';
    recipeImagePreview.innerHTML = '';
}

// Image Preview Handler
function handleImagePreview(event, previewContainer) {
    const file = event.target.files[0];
    if (file) {
        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            showNotification('이미지 크기는 5MB 이하여야 합니다.', 'error');
            event.target.value = '';
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            previewContainer.innerHTML = `
                <img src="${e.target.result}" alt="Preview" style="max-width: 200px; max-height: 200px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <div class="image-preview-text">${file.name}</div>
                <button type="button" class="remove-image" onclick="removeImagePreview('${event.target.id}', '${previewContainer.id}')">이미지 제거</button>
            `;
        };
        reader.readAsDataURL(file);
    } else {
        previewContainer.innerHTML = '';
    }
}

// Remove Image Preview
window.removeImagePreview = function(inputId, previewId) {
    document.getElementById(inputId).value = '';
    document.getElementById(previewId).innerHTML = '';
}

// CRUD Operations
async function handleSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(itemForm);
    
    try {
        if (currentTab === 'additives') {
            // Process aliases for additives
            const aliases = formData.get('aliases');
            if (aliases) {
                formData.set('aliases', JSON.stringify(aliases.split(',').map(alias => alias.trim()).filter(alias => alias)));
            } else {
                formData.set('aliases', JSON.stringify([]));
            }
            
            if (editingItem) {
                await updateAdditive(editingItem.id, formData);
            } else {
                await createAdditive(formData);
            }
        } else {
            if (editingItem) {
                await updateRecipe(editingItem.id, formData);
            } else {
                await createRecipe(formData);
            }
        }
        
        closeModalHandler();
        await loadData();
        showNotification(`${currentTab === 'additives' ? '첨가물' : '레시피'}이 저장되었습니다.`, 'success');
    } catch (error) {
        showNotification('저장에 실패했습니다.', 'error');
        console.error('Save error:', error);
    }
}

// API Calls
async function createAdditive(formData) {
    const response = await fetch(`${API_BASE_URL}/admin/additives`, {
        method: 'POST',
        body: formData  // Send FormData directly for file upload
    });
    
    if (!response.ok) throw new Error('Failed to create additive');
    additives = []; // Force reload
}

async function updateAdditive(id, formData) {
    const response = await fetch(`${API_BASE_URL}/admin/additives/${id}`, {
        method: 'PUT',
        body: formData  // Send FormData directly for file upload
    });
    
    if (!response.ok) throw new Error('Failed to update additive');
    additives = []; // Force reload
}

async function deleteAdditive(id) {
    if (!confirm('정말 이 첨가물을 삭제하시겠습니까?')) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/admin/additives/${id}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) throw new Error('Failed to delete additive');
        
        additives = []; // Force reload
        await loadData();
        showNotification('첨가물이 삭제되었습니다.', 'success');
    } catch (error) {
        showNotification('삭제에 실패했습니다.', 'error');
        console.error('Delete error:', error);
    }
}

async function createRecipe(formData) {
    const response = await fetch(`${API_BASE_URL}/admin/recipes`, {
        method: 'POST',
        body: formData  // Send FormData directly for file upload
    });
    
    if (!response.ok) throw new Error('Failed to create recipe');
    recipes = []; // Force reload
}

async function updateRecipe(id, formData) {
    const response = await fetch(`${API_BASE_URL}/admin/recipes/${id}`, {
        method: 'PUT',
        body: formData  // Send FormData directly for file upload
    });
    
    if (!response.ok) throw new Error('Failed to update recipe');
    recipes = []; // Force reload
}

async function deleteRecipe(id) {
    if (!confirm('정말 이 레시피를 삭제하시겠습니까?')) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/admin/recipes/${id}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) throw new Error('Failed to delete recipe');
        
        recipes = []; // Force reload
        await loadData();
        showNotification('레시피가 삭제되었습니다.', 'success');
    } catch (error) {
        showNotification('삭제에 실패했습니다.', 'error');
        console.error('Delete error:', error);
    }
}

// Edit Functions (called from rendered HTML)
function editAdditive(id) {
    const additive = additives.find(item => item.id === id);
    if (additive) {
        openModal('additive', additive);
    }
}

function editRecipe(id) {
    const recipe = recipes.find(item => item.id === id);
    if (recipe) {
        openModal('recipe', recipe);
    }
}

// Utility Functions
function showLoading(show) {
    loading.classList.toggle('show', show);
}

function showNotification(message, type = 'success') {
    notification.textContent = message;
    notification.className = `notification ${type} show`;
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

function getHazardText(level) {
    switch (level) {
        case 'low': return '낮음';
        case 'medium': return '보통';
        case 'high': return '높음';
        default: return level;
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Add empty state styles
const style = document.createElement('style');
style.textContent = `
    .empty-state {
        text-align: center;
        padding: 60px 20px;
        color: #999;
        font-size: 16px;
        grid-column: 1 / -1;
        background: #f9f9f9;
        border-radius: 12px;
        border: 2px dashed #ddd;
    }
`;
document.head.appendChild(style);