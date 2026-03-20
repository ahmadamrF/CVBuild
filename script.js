const STORAGE_KEY = "cvBuilderStateV2";
const AI_ENHANCE_ENDPOINT = "/api/enhance";
const COVER_LETTER_ENDPOINT = "/api/cover-letter";
const CV_PARSE_ENDPOINT = "/api/parse-cv";
const AI_DEV_DIRECT_MODE = false;
const AI_DEV_GROQ_KEY = "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";
const BUILTIN_SECTION_KEYS = [
  "fullName",
  "jobTitle",
  "links",
  "summary",
  "experience",
  "education",
  "projects",
  "languages",
  "skills"
];

const LANGUAGE_LEVELS = [
  { label: "Native", value: "native", score: 100 },
  { label: "C2", value: "c2", score: 95 },
  { label: "C1", value: "c1", score: 85 },
  { label: "B2", value: "b2", score: 72 },
  { label: "B1", value: "b1", score: 58 },
  { label: "A2", value: "a2", score: 42 },
  { label: "A1", value: "a1", score: 28 }
];

let state = loadInitialState();
let sectionSortableInstance;
let experienceSortableInstance;
let educationSortableInstance;
let projectsSortableInstance;
let languagesSortableInstance;
let toastHost;

const dom = {
  fullNameInput: document.getElementById("fullNameInput"),
  jobTitleInput: document.getElementById("jobTitleInput"),
  linkedinInput: document.getElementById("linkedinInput"),
  githubInput: document.getElementById("githubInput"),
  summaryInput: document.getElementById("summaryInput"),
  customSectionTitleInput: document.getElementById("customSectionTitleInput"),
  addCustomSectionBtn: document.getElementById("addCustomSectionBtn"),
  sectionsContainer: document.getElementById("sectionsContainer"),
  experienceEntries: document.getElementById("experienceEntries"),
  educationEntries: document.getElementById("educationEntries"),
  projectEntries: document.getElementById("projectEntries"),
  languageEntries: document.getElementById("languageEntries"),
  addExperienceBtn: document.getElementById("addExperienceBtn"),
  addEducationBtn: document.getElementById("addEducationBtn"),
  addProjectBtn: document.getElementById("addProjectBtn"),
  addLanguageBtn: document.getElementById("addLanguageBtn"),
  skillInput: document.getElementById("skillInput"),
  addSkillBtn: document.getElementById("addSkillBtn"),
  skillsListEditor: document.getElementById("skillsListEditor"),
  templateSelect: document.getElementById("templateSelect"),
  accentColorInput: document.getElementById("accentColorInput"),
  fontSelect: document.getElementById("fontSelect"),
  atsModeToggle: document.getElementById("atsModeToggle"),
  saveBtn: document.getElementById("saveBtn"),
  loadBtn: document.getElementById("loadBtn"),
  importExistingCvBtn: document.getElementById("importExistingCvBtn"),
  exportJsonBtn: document.getElementById("exportJsonBtn"),
  importJsonBtn: document.getElementById("importJsonBtn"),
  importJsonFile: document.getElementById("importJsonFile"),
  existingCvFileInput: document.getElementById("existingCvFileInput"),
  shareLinkBtn: document.getElementById("shareLinkBtn"),
  pdfExportModeSelect: document.getElementById("pdfExportModeSelect"),
  exportPdfBtn: document.getElementById("exportPdfBtn"),
  cvPreview: document.getElementById("cvPreview"),
  statusMessage: document.getElementById("statusMessage"),
  coverLetterBtn: document.getElementById("coverLetterBtn"),
  coverLetterModal: document.getElementById("coverLetterModal"),
  closeCoverLetterModalBtn: document.getElementById("closeCoverLetterModalBtn"),
  jobDescriptionInput: document.getElementById("jobDescriptionInput"),
  generateCoverLetterBtn: document.getElementById("generateCoverLetterBtn"),
  copyCoverLetterBtn: document.getElementById("copyCoverLetterBtn"),
  coverLetterOutput: document.getElementById("coverLetterOutput")
};

init();

function init() {
  applySharedStateFromUrlIfPresent();
  initToastService();
  if (AI_DEV_DIRECT_MODE) {
    showToast("Dev direct AI mode is ON (API key is exposed in browser).", "info", 5000);
  }
  hydrateInputs();
  renderAllEditors();
  applySectionOrderToEditor();
  ensureBuiltinSectionDeleteButtons();
  initSortables();
  bindEvents();
  attachAiEnhanceButtons();
  renderPreview();
}

function bindEvents() {
  dom.fullNameInput.addEventListener("input", (event) => {
    state.fullName = event.target.value;
    persistAndRenderPreview();
  });

  dom.jobTitleInput.addEventListener("input", (event) => {
    state.jobTitle = event.target.value;
    persistAndRenderPreview();
  });

  dom.linkedinInput.addEventListener("input", (event) => {
    state.linkedin = event.target.value;
    persistAndRenderPreview();
  });

  dom.githubInput.addEventListener("input", (event) => {
    state.github = event.target.value;
    persistAndRenderPreview();
  });

  dom.summaryInput.addEventListener("input", (event) => {
    state.summary = event.target.value;
    persistAndRenderPreview();
  });

  document.querySelectorAll(".format-actions button").forEach((button) => {
    button.addEventListener("click", () => applyFormatting(button.dataset.formatTarget, button.dataset.formatType));
  });

  dom.templateSelect.addEventListener("change", (event) => {
    state.design.template = event.target.value;
    persistAndRenderPreview();
  });

  dom.accentColorInput.addEventListener("input", (event) => {
    state.design.accentColor = event.target.value;
    persistAndRenderPreview();
  });

  dom.fontSelect.addEventListener("change", (event) => {
    state.design.font = event.target.value;
    persistAndRenderPreview();
  });

  dom.atsModeToggle.addEventListener("change", (event) => {
    state.design.atsMode = event.target.checked;
    persistAndRenderPreview();
  });

  dom.addCustomSectionBtn.addEventListener("click", addCustomSection);
  dom.customSectionTitleInput.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    addCustomSection();
  });

  dom.addExperienceBtn.addEventListener("click", () => {
    state.experience.push(createExperienceEntry());
    renderExperienceEditor();
    initEntrySortables();
    persistAndRenderPreview();
  });

  dom.addEducationBtn.addEventListener("click", () => {
    state.education.push(createEducationEntry());
    renderEducationEditor();
    initEntrySortables();
    persistAndRenderPreview();
  });

  dom.addProjectBtn.addEventListener("click", () => {
    state.projects.push(createProjectEntry());
    renderProjectsEditor();
    initEntrySortables();
    persistAndRenderPreview();
  });

  dom.addLanguageBtn.addEventListener("click", () => {
    state.languages.push(createLanguageEntry());
    renderLanguagesEditor();
    initEntrySortables();
    persistAndRenderPreview();
  });

  dom.sectionsContainer.addEventListener("input", handleEditorInput);
  dom.sectionsContainer.addEventListener("click", handleEditorClicks);

  dom.addSkillBtn.addEventListener("click", addSkillFromInput);
  dom.skillInput.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    addSkillFromInput();
  });

  dom.skillsListEditor.addEventListener("click", (event) => {
    const target = event.target;
    if (!target.matches("[data-action='remove-skill']")) return;
    const index = Number(target.dataset.index);
    if (Number.isNaN(index)) return;
    state.skills.splice(index, 1);
    renderSkillsEditor();
    persistAndRenderPreview();
  });

  dom.saveBtn.addEventListener("click", () => {
    saveState();
    setStatus("Draft saved to localStorage.");
  });

  dom.loadBtn.addEventListener("click", () => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      setStatus("No saved draft found.");
      return;
    }
    state = sanitizeState(safeJsonParse(raw));
    refreshUIFromState("Draft loaded.");
  });

  dom.importExistingCvBtn.addEventListener("click", () => dom.existingCvFileInput.click());
  dom.existingCvFileInput.addEventListener("change", importExistingCvFile);
  dom.exportJsonBtn.addEventListener("click", exportJson);
  dom.importJsonBtn.addEventListener("click", () => dom.importJsonFile.click());
  dom.importJsonFile.addEventListener("change", importJsonFile);

  dom.shareLinkBtn.addEventListener("click", copyShareLink);
  dom.exportPdfBtn.addEventListener("click", exportPdf);

  dom.coverLetterBtn.addEventListener("click", openCoverLetterModal);
  dom.closeCoverLetterModalBtn.addEventListener("click", closeCoverLetterModal);
  dom.generateCoverLetterBtn.addEventListener("click", generateCoverLetter);
  dom.copyCoverLetterBtn.addEventListener("click", copyCoverLetterOutput);
  dom.coverLetterModal.addEventListener("click", (event) => {
    if (event.target === dom.coverLetterModal) closeCoverLetterModal();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !dom.coverLetterModal.hidden) closeCoverLetterModal();
  });
}

function initSortables() {
  if (sectionSortableInstance) sectionSortableInstance.destroy();
  sectionSortableInstance = new Sortable(dom.sectionsContainer, {
    animation: 180,
    handle: ".drag-handle",
    ghostClass: "drag-ghost",
    onEnd: () => {
      state.sectionOrder = [...dom.sectionsContainer.querySelectorAll(".editor-card")]
        .map((card) => card.dataset.section)
        .filter(Boolean);
      persistAndRenderPreview();
    }
  });

  initEntrySortables();
}

function initEntrySortables() {
  if (experienceSortableInstance) experienceSortableInstance.destroy();
  if (educationSortableInstance) educationSortableInstance.destroy();
  if (projectsSortableInstance) projectsSortableInstance.destroy();
  if (languagesSortableInstance) languagesSortableInstance.destroy();

  experienceSortableInstance = createEntrySortable(dom.experienceEntries, "experience");
  educationSortableInstance = createEntrySortable(dom.educationEntries, "education");
  projectsSortableInstance = createEntrySortable(dom.projectEntries, "projects");
  languagesSortableInstance = createEntrySortable(dom.languageEntries, "languages");
}

function createEntrySortable(container, key) {
  return new Sortable(container, {
    animation: 160,
    handle: ".item-drag",
    draggable: ".repeatable-item",
    ghostClass: "drag-ghost",
    onEnd: () => {
      const ids = [...container.querySelectorAll(".repeatable-item")]
        .map((item) => item.dataset.id)
        .filter(Boolean);
      state[key] = ids.map((id) => state[key].find((entry) => entry.id === id)).filter(Boolean);
      persistAndRenderPreview();
    }
  });
}

function handleEditorInput(event) {
  const target = event.target;
  const id = target.dataset.id;
  const key = target.dataset.key;
  if (!id) return;

  if (target.matches("[data-type='experience-field']")) {
    const entry = state.experience.find((item) => item.id === id);
    if (!entry) return;
    entry[key] = target.value;
    persistAndRenderPreview();
    return;
  }

  if (target.matches("[data-type='education-field']")) {
    const entry = state.education.find((item) => item.id === id);
    if (!entry) return;
    entry[key] = target.value;
    persistAndRenderPreview();
    return;
  }

  if (target.matches("[data-type='project-field']")) {
    const entry = state.projects.find((item) => item.id === id);
    if (!entry) return;
    entry[key] = target.value;
    persistAndRenderPreview();
    return;
  }

  if (target.matches("[data-type='language-field']")) {
    const entry = state.languages.find((item) => item.id === id);
    if (!entry) return;
    entry[key] = target.value;
    persistAndRenderPreview();
    return;
  }

  if (target.matches("[data-type='custom-title']")) {
    const section = state.customSections.find((item) => item.id === id);
    if (!section) return;
    section.title = target.value;
    persistAndRenderPreview();
    return;
  }

  if (target.matches("[data-type='custom-content']")) {
    const section = state.customSections.find((item) => item.id === id);
    if (!section) return;
    section.content = target.value;
    persistAndRenderPreview();
  }
}

function handleEditorClicks(event) {
  const target = event.target;
  if (target.matches("[data-action='enhance-text']")) {
    enhanceFieldText(target);
    return;
  }
  if (target.matches("[data-action='remove-section']")) {
    removeBuiltinSection(target.dataset.section);
    return;
  }
  if (target.matches("[data-action='format-experience']")) {
    applyFormatting(target.dataset.formatTarget, target.dataset.formatType);
    return;
  }
  if (target.matches("[data-action='format-project']")) {
    applyFormatting(target.dataset.formatTarget, target.dataset.formatType);
    return;
  }

  const id = target.dataset.id;
  if (!id) return;

  if (target.matches("[data-action='remove-experience']")) {
    state.experience = state.experience.filter((item) => item.id !== id);
    renderExperienceEditor();
    initEntrySortables();
    persistAndRenderPreview();
    return;
  }

  if (target.matches("[data-action='remove-education']")) {
    state.education = state.education.filter((item) => item.id !== id);
    renderEducationEditor();
    initEntrySortables();
    persistAndRenderPreview();
    return;
  }

  if (target.matches("[data-action='remove-project']")) {
    state.projects = state.projects.filter((item) => item.id !== id);
    renderProjectsEditor();
    initEntrySortables();
    persistAndRenderPreview();
    return;
  }

  if (target.matches("[data-action='remove-language']")) {
    state.languages = state.languages.filter((item) => item.id !== id);
    renderLanguagesEditor();
    initEntrySortables();
    persistAndRenderPreview();
    return;
  }

  if (target.matches("[data-action='remove-custom-section']")) {
    removeCustomSection(id);
    return;
  }
}

function hydrateInputs() {
  dom.fullNameInput.value = state.fullName;
  dom.jobTitleInput.value = state.jobTitle;
  dom.linkedinInput.value = state.linkedin;
  dom.githubInput.value = state.github;
  dom.summaryInput.value = state.summary;
  dom.templateSelect.value = state.design.template;
  dom.accentColorInput.value = state.design.accentColor;
  dom.fontSelect.value = state.design.font;
  dom.atsModeToggle.checked = state.design.atsMode;
}

function renderAllEditors() {
  renderExperienceEditor();
  renderEducationEditor();
  renderProjectsEditor();
  renderLanguagesEditor();
  renderSkillsEditor();
  renderCustomSectionCards();
}

function renderCustomSectionCards() {
  dom.sectionsContainer
    .querySelectorAll("[data-custom-card='true']")
    .forEach((card) => card.remove());

  state.customSections.forEach((section) => {
    const card = document.createElement("section");
    card.className = "editor-card";
    card.dataset.section = section.id;
    card.dataset.customCard = "true";
    card.innerHTML = `
      <div class="card-header">
        <h2>Custom Section</h2>
        <span class="drag-handle" title="Drag section">::</span>
      </div>
      <input data-type="custom-title" data-id="${section.id}" type="text" placeholder="Section title" value="${escapeAttr(section.title)}">
      <textarea data-type="custom-content" data-id="${section.id}" rows="4" placeholder="Section content...">${escapeHtml(section.content)}</textarea>
      <button type="button" class="remove-btn" data-action="remove-custom-section" data-id="${section.id}">Remove Section</button>
    `;
    dom.sectionsContainer.appendChild(card);
  });
  attachAiEnhanceButtons();
}

function applySectionOrderToEditor() {
  const hiddenBuiltins = new Set(state.hiddenSections || []);
  const cards = [...dom.sectionsContainer.querySelectorAll(".editor-card")].filter((card) => {
    const sectionKey = card.dataset.section;
    if (hiddenBuiltins.has(sectionKey) && BUILTIN_SECTION_KEYS.includes(sectionKey)) {
      card.remove();
      return false;
    }
    return true;
  });
  const map = new Map(cards.map((card) => [card.dataset.section, card]));
  const availableKeys = new Set(cards.map((card) => card.dataset.section));

  state.sectionOrder = state.sectionOrder.filter((sectionKey) => {
    if (hiddenBuiltins.has(sectionKey) && BUILTIN_SECTION_KEYS.includes(sectionKey)) return false;
    return availableKeys.has(sectionKey);
  });
  cards.forEach((card) => {
    if (!state.sectionOrder.includes(card.dataset.section)) state.sectionOrder.push(card.dataset.section);
  });
  state.sectionOrder.forEach((sectionKey) => {
    const card = map.get(sectionKey);
    if (card) dom.sectionsContainer.appendChild(card);
  });
}

function renderExperienceEditor() {
  if (!state.experience.length) {
    dom.experienceEntries.innerHTML = `<p class="empty-note">No entries yet. Add one to start.</p>`;
    return;
  }
  dom.experienceEntries.innerHTML = state.experience.map((entry, index) => `
    <div class="repeatable-item" data-id="${entry.id}">
      <div class="repeatable-item-header">
        <h3><span class="item-drag" title="Drag entry">::</span> Experience ${index + 1}</h3>
        <button type="button" class="remove-btn" data-action="remove-experience" data-id="${entry.id}">Remove</button>
      </div>
      <div class="field-row">
        <input data-type="experience-field" data-id="${entry.id}" data-key="title" type="text" placeholder="Role / Position" value="${escapeAttr(entry.title)}">
        <input data-type="experience-field" data-id="${entry.id}" data-key="company" type="text" placeholder="Company" value="${escapeAttr(entry.company)}">
      </div>
      <input data-type="experience-field" data-id="${entry.id}" data-key="date" type="text" placeholder="e.g., Jan 2022 - Present" value="${escapeAttr(entry.date)}">
      <div class="format-actions">
        <button type="button" data-action="format-experience" data-format-target="exp_${entry.id}" data-format-type="bold">Bold</button>
        <button type="button" data-action="format-experience" data-format-target="exp_${entry.id}" data-format-type="bullet">Bullet</button>
      </div>
      <textarea id="exp_${entry.id}" data-type="experience-field" data-id="${entry.id}" data-key="description" rows="3" placeholder="Main achievements and responsibilities...">${escapeHtml(entry.description)}</textarea>
    </div>
  `).join("");
  attachAiEnhanceButtons();
}

function renderEducationEditor() {
  if (!state.education.length) {
    dom.educationEntries.innerHTML = `<p class="empty-note">No entries yet. Add one to start.</p>`;
    return;
  }
  dom.educationEntries.innerHTML = state.education.map((entry, index) => `
    <div class="repeatable-item" data-id="${entry.id}">
      <div class="repeatable-item-header">
        <h3><span class="item-drag" title="Drag entry">::</span> Education ${index + 1}</h3>
        <button type="button" class="remove-btn" data-action="remove-education" data-id="${entry.id}">Remove</button>
      </div>
      <div class="field-row">
        <input data-type="education-field" data-id="${entry.id}" data-key="degree" type="text" placeholder="Degree / Program" value="${escapeAttr(entry.degree)}">
        <input data-type="education-field" data-id="${entry.id}" data-key="school" type="text" placeholder="University / School" value="${escapeAttr(entry.school)}">
      </div>
      <input data-type="education-field" data-id="${entry.id}" data-key="date" type="text" placeholder="e.g., 2018 - 2022" value="${escapeAttr(entry.date)}">
      <textarea data-type="education-field" data-id="${entry.id}" data-key="description" rows="3" placeholder="Relevant coursework or highlights...">${escapeHtml(entry.description)}</textarea>
    </div>
  `).join("");
  attachAiEnhanceButtons();
}

function renderProjectsEditor() {
  if (!state.projects.length) {
    dom.projectEntries.innerHTML = `<p class="empty-note">No entries yet. Add one to start.</p>`;
    return;
  }
  dom.projectEntries.innerHTML = state.projects.map((entry, index) => `
    <div class="repeatable-item" data-id="${entry.id}">
      <div class="repeatable-item-header">
        <h3><span class="item-drag" title="Drag entry">::</span> Project ${index + 1}</h3>
        <button type="button" class="remove-btn" data-action="remove-project" data-id="${entry.id}">Remove</button>
      </div>
      <div class="field-row">
        <input data-type="project-field" data-id="${entry.id}" data-key="name" type="text" placeholder="Project name" value="${escapeAttr(entry.name)}">
        <input data-type="project-field" data-id="${entry.id}" data-key="stack" type="text" placeholder="Tech stack" value="${escapeAttr(entry.stack)}">
      </div>
      <input data-type="project-field" data-id="${entry.id}" data-key="link" type="text" placeholder="Project URL" value="${escapeAttr(entry.link)}">
      <div class="format-actions">
        <button type="button" data-action="format-project" data-format-target="proj_${entry.id}" data-format-type="bold">Bold</button>
        <button type="button" data-action="format-project" data-format-target="proj_${entry.id}" data-format-type="bullet">Bullet</button>
      </div>
      <textarea id="proj_${entry.id}" data-type="project-field" data-id="${entry.id}" data-key="achievements" rows="3" placeholder="Achievements / impact...">${escapeHtml(entry.achievements)}</textarea>
    </div>
  `).join("");
  attachAiEnhanceButtons();
}

function renderLanguagesEditor() {
  if (!state.languages.length) {
    dom.languageEntries.innerHTML = `<p class="empty-note">No entries yet. Add one to start.</p>`;
    return;
  }
  dom.languageEntries.innerHTML = state.languages.map((entry, index) => `
    <div class="repeatable-item" data-id="${entry.id}">
      <div class="repeatable-item-header">
        <h3><span class="item-drag" title="Drag entry">::</span> Language ${index + 1}</h3>
        <button type="button" class="remove-btn" data-action="remove-language" data-id="${entry.id}">Remove</button>
      </div>
      <div class="field-row">
        <input data-type="language-field" data-id="${entry.id}" data-key="name" type="text" placeholder="Language" value="${escapeAttr(entry.name)}">
        <select data-type="language-field" data-id="${entry.id}" data-key="level">
          ${LANGUAGE_LEVELS.map((level) => `<option value="${level.value}" ${entry.level === level.value ? "selected" : ""}>${level.label}</option>`).join("")}
        </select>
      </div>
    </div>
  `).join("");
  attachAiEnhanceButtons();
}

function renderSkillsEditor() {
  if (!state.skills.length) {
    dom.skillsListEditor.innerHTML = `<li class="empty-note">No skills added yet.</li>`;
    return;
  }
  dom.skillsListEditor.innerHTML = state.skills.map((skill, index) => `
    <li class="skill-chip">
      <span>${escapeHtml(skill)}</span>
      <button type="button" data-action="remove-skill" data-index="${index}" aria-label="Remove ${escapeAttr(skill)}">x</button>
    </li>
  `).join("");
  attachAiEnhanceButtons();
}

function addSkillFromInput() {
  const value = dom.skillInput.value.trim();
  if (!value) return;
  if (state.skills.includes(value)) {
    setStatus("Skill already added.");
    return;
  }
  state.skills.push(value);
  dom.skillInput.value = "";
  renderSkillsEditor();
  persistAndRenderPreview();
}

function addCustomSection() {
  const title = dom.customSectionTitleInput.value.trim() || "Custom Section";
  const newSection = { id: uid("custom"), title, content: "" };
  state.customSections.push(newSection);
  state.sectionOrder.push(newSection.id);
  dom.customSectionTitleInput.value = "";
  renderCustomSectionCards();
  applySectionOrderToEditor();
  persistAndRenderPreview();
  setStatus("Custom section added.");
}

function removeCustomSection(id) {
  state.customSections = state.customSections.filter((section) => section.id !== id);
  state.sectionOrder = state.sectionOrder.filter((sectionKey) => sectionKey !== id);
  renderCustomSectionCards();
  applySectionOrderToEditor();
  persistAndRenderPreview();
  setStatus("Custom section removed.");
}

function ensureBuiltinSectionDeleteButtons() {
  BUILTIN_SECTION_KEYS.forEach((sectionKey) => {
    const card = dom.sectionsContainer.querySelector(`.editor-card[data-section='${sectionKey}']`);
    if (!card) return;
    const header = card.querySelector(".card-header");
    if (!header) return;
    if (header.querySelector("[data-action='remove-section']")) return;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "remove-btn section-remove-btn";
    button.dataset.action = "remove-section";
    button.dataset.section = sectionKey;
    button.textContent = "Delete Section";

    const dragHandle = header.querySelector(".drag-handle");
    if (dragHandle) {
      header.insertBefore(button, dragHandle);
    } else {
      header.appendChild(button);
    }
  });
}

function removeBuiltinSection(sectionKey) {
  if (!BUILTIN_SECTION_KEYS.includes(sectionKey)) return;
  if (!Array.isArray(state.hiddenSections)) state.hiddenSections = [];
  if (!state.hiddenSections.includes(sectionKey)) state.hiddenSections.push(sectionKey);
  state.sectionOrder = state.sectionOrder.filter((key) => key !== sectionKey);

  const card = dom.sectionsContainer.querySelector(`.editor-card[data-section='${sectionKey}']`);
  if (card) card.remove();
  persistAndRenderPreview();
  setStatus("Section deleted.");
}

function applyFormatting(targetId, type) {
  const target = document.getElementById(targetId);
  if (!target) return;
  const start = target.selectionStart ?? target.value.length;
  const end = target.selectionEnd ?? target.value.length;
  const selected = target.value.slice(start, end);
  let insert = "";

  if (type === "bold") insert = `**${selected || "text"}**`;
  if (type === "bullet") insert = `${selected ? `- ${selected}` : "- item"}`;
  if (!insert) return;

  target.setRangeText(insert, start, end, "end");
  target.dispatchEvent(new Event("input", { bubbles: true }));
  target.focus();
}

function attachAiEnhanceButtons() {
  if (!dom.sectionsContainer) return;

  const fields = dom.sectionsContainer.querySelectorAll("input[type='text'], textarea");
  fields.forEach((field) => {
    if (field.dataset.aiEnhancedControl === "true") return;

    if (!field.id) field.id = uid("field");

    const wrapper = document.createElement("div");
    wrapper.className = "ai-field-wrap";
    field.parentElement.insertBefore(wrapper, field);
    wrapper.appendChild(field);

    const button = document.createElement("button");
    button.type = "button";
    button.className = "ai-enhance-btn";
    button.dataset.action = "enhance-text";
    button.dataset.targetId = field.id;
    button.dataset.section = getSectionNameForField(field);
    button.textContent = "Enhance with AI";
    wrapper.appendChild(button);

    field.dataset.aiEnhancedControl = "true";
  });
}

async function enhanceFieldText(button) {
  const targetId = button.dataset.targetId;
  const targetField = targetId ? document.getElementById(targetId) : null;
  if (!targetField) {
    setStatus("Could not find the selected text field.");
    showToast("AI enhancement failed: target field was not found.", "error");
    return;
  }

  const currentText = String(targetField.value || "").trim();
  if (!currentText) {
    setStatus("Write some text first, then enhance it.");
    showToast("Write some text first, then try AI enhance.", "info");
    targetField.focus();
    return;
  }

  const previousLabel = button.textContent;
  button.disabled = true;
  button.textContent = "Enhancing...";
  setStatus("Enhancing text with AI...");
  showToast("Enhancing text with AI...", "info", 1500);

  try {
    const enhancePayload = {
      text: targetField.value,
      section: button.dataset.section || "CV section",
      fieldLabel: getFieldLabel(targetField),
      context: {
        fullName: state.fullName,
        jobTitle: state.jobTitle,
        summary: state.summary
      }
    };
    const enhancedText = AI_DEV_DIRECT_MODE
      ? await requestEnhancementDirect(enhancePayload)
      : await requestEnhancementViaServer(enhancePayload);

    if (!enhancedText) {
      throw new Error("The AI response was empty.");
    }

    targetField.value = enhancedText;
    targetField.dispatchEvent(new Event("input", { bubbles: true }));
    targetField.focus();
    setStatus("Text enhanced while keeping your original context.");
    showToast("Text enhanced successfully.", "success");
  } catch (error) {
    console.error("AI enhancement error:", error);
    const errorMessage = error.message || "Unknown error.";
    setStatus(`AI enhancement failed: ${errorMessage}`);
    showToast(`AI enhancement failed: ${errorMessage}`, "error", 5000);
  } finally {
    button.disabled = false;
    button.textContent = previousLabel;
  }
}

function getSectionNameForField(field) {
  const card = field.closest(".editor-card");
  const cardTitle = card?.querySelector(".card-header h2")?.textContent?.trim();
  if (cardTitle) return cardTitle;
  if (field.closest(".custom-section-creator")) return "Custom section setup";
  return "CV section";
}

function getFieldLabel(field) {
  if (field.placeholder) return field.placeholder;
  if (field.dataset.key) return field.dataset.key;
  return field.name || field.id || "text";
}

async function requestEnhancementViaServer(payload) {
  const response = await fetch(AI_ENHANCE_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Request failed.");
  }

  return String(data.text || "").trim();
}

async function requestEnhancementDirect(payload) {
  if (!AI_DEV_GROQ_KEY || AI_DEV_GROQ_KEY === "REPLACE_WITH_YOUR_GROQ_API_KEY") {
    throw new Error("Set AI_DEV_GROQ_KEY in script.js for direct mode.");
  }

  const systemPrompt = [
    "You improve resume text.",
    "Keep the exact meaning, context, and factual details.",
    "Do not add fake claims, awards, dates, metrics, tools, companies, or responsibilities.",
    "Do not change language unless the input is mixed.",
    "Make it clearer, more professional, and concise.",
    "Return plain text only with no markdown and no explanations."
  ].join(" ");

  const userPrompt = [
    `Section: ${payload.section}`,
    `Field: ${payload.fieldLabel}`,
    `CV context: ${JSON.stringify(payload.context || {})}`,
    "Original text:",
    payload.text
  ].join("\n");

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${AI_DEV_GROQ_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      temperature: 0.3,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ]
    })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMessage = data?.error?.message || data?.message || "Groq request failed.";
    throw new Error(errorMessage);
  }

  return String(data?.choices?.[0]?.message?.content || "").trim();
}

function openCoverLetterModal() {
  dom.coverLetterModal.hidden = false;
  document.body.classList.add("modal-open");
  dom.jobDescriptionInput.focus();
}

function closeCoverLetterModal() {
  dom.coverLetterModal.hidden = true;
  document.body.classList.remove("modal-open");
}

async function generateCoverLetter() {
  const jobDescription = String(dom.jobDescriptionInput.value || "").trim();
  if (!jobDescription) {
    showToast("Add the job description first.", "info");
    dom.jobDescriptionInput.focus();
    return;
  }

  const originalLabel = dom.generateCoverLetterBtn.textContent;
  dom.generateCoverLetterBtn.disabled = true;
  dom.generateCoverLetterBtn.textContent = "Generating...";
  showToast("Generating cover letter...", "info", 1500);

  try {
    const payload = { jobDescription, cv: buildCvContextForAi() };
    const letter = AI_DEV_DIRECT_MODE
      ? await requestCoverLetterDirect(payload)
      : await requestCoverLetterViaServer(payload);
    if (!letter) throw new Error("No cover letter text returned.");
    dom.coverLetterOutput.value = letter;
    showToast("Cover letter generated successfully.", "success");
  } catch (error) {
    const errorMessage = error.message || "Unknown error.";
    showToast(`Cover letter generation failed: ${errorMessage}`, "error", 5000);
  } finally {
    dom.generateCoverLetterBtn.disabled = false;
    dom.generateCoverLetterBtn.textContent = originalLabel;
  }
}

async function copyCoverLetterOutput() {
  const value = String(dom.coverLetterOutput.value || "").trim();
  if (!value) {
    showToast("No cover letter to copy yet.", "info");
    return;
  }
  try {
    await navigator.clipboard.writeText(value);
    showToast("Cover letter copied.", "success");
  } catch {
    showToast("Could not copy cover letter.", "error");
  }
}

function buildCvContextForAi() {
  return {
    fullName: state.fullName,
    jobTitle: state.jobTitle,
    linkedin: state.linkedin,
    github: state.github,
    summary: state.summary,
    experience: state.experience,
    education: state.education,
    projects: state.projects,
    languages: state.languages,
    skills: state.skills,
    customSections: state.customSections
  };
}

async function requestCoverLetterViaServer(payload) {
  const response = await fetch(COVER_LETTER_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed.");
  return String(data.text || "").trim();
}

async function requestCoverLetterDirect(payload) {
  if (!AI_DEV_GROQ_KEY || AI_DEV_GROQ_KEY === "REPLACE_WITH_YOUR_GROQ_API_KEY") {
    throw new Error("Set AI_DEV_GROQ_KEY in script.js for direct mode.");
  }

  const systemPrompt = [
    "You write tailored, truthful cover letters based on CV data and a job description.",
    "Do not invent experience, metrics, companies, skills, or certifications.",
    "Keep the tone professional and concise.",
    "Output plain text only with no markdown."
  ].join(" ");

  const userPrompt = [
    "Write a tailored cover letter.",
    "Job description:",
    payload.jobDescription,
    "Candidate CV JSON:",
    JSON.stringify(payload.cv)
  ].join("\n\n");

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${AI_DEV_GROQ_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      temperature: 0.35,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ]
    })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMessage = data?.error?.message || data?.message || "Groq request failed.";
    throw new Error(errorMessage);
  }

  return String(data?.choices?.[0]?.message?.content || "").trim();
}

function renderPreview() {
  dom.cvPreview.innerHTML = "";
  applyDesignToPreview();

  state.sectionOrder.forEach((sectionKey) => {
    const sectionNode = renderPreviewSection(sectionKey);
    if (sectionNode) dom.cvPreview.appendChild(sectionNode);
  });
}

function applyDesignToPreview() {
  const classList = dom.cvPreview.classList;
  classList.remove("template-modern", "template-classic", "template-minimal", "ats-mode");
  classList.add(`template-${state.design.template}`);
  if (state.design.atsMode) classList.add("ats-mode");

  const fontMap = {
    jakarta: `"Plus Jakarta Sans", "Segoe UI", sans-serif`,
    lato: `"Lato", "Segoe UI", sans-serif`,
    nunito: `"Nunito Sans", "Segoe UI", sans-serif`
  };
  dom.cvPreview.style.setProperty("--cv-accent", state.design.accentColor);
  dom.cvPreview.style.setProperty("--cv-font", fontMap[state.design.font] || fontMap.jakarta);

  // Compute derived accent shades as plain rgb() values so that html2canvas
  // (which does not support color-mix()) can render the CV correctly for PDF export.
  // Each blendColors call replicates a color-mix(in srgb, accent W%, base) expression.
  const accentRgb = hexToRgb(state.design.accentColor);
  if (accentRgb) {
    // color-mix(in srgb, accent 80%, #1b2b38) — cv-title text
    dom.cvPreview.style.setProperty("--cv-title-color",   blendColors(accentRgb, { r: 27,  g: 43,  b: 56  }, 0.80));
    // color-mix(in srgb, accent 72%, #2b3e4d) — section heading text
    dom.cvPreview.style.setProperty("--cv-section-color", blendColors(accentRgb, { r: 43,  g: 62,  b: 77  }, 0.72));
    // color-mix(in srgb, accent 12%, #ffffff) — skill chip background
    dom.cvPreview.style.setProperty("--cv-skill-bg",      blendColors(accentRgb, { r: 255, g: 255, b: 255 }, 0.12));
    // color-mix(in srgb, accent 22%, #d4e5f3) — skill chip border
    dom.cvPreview.style.setProperty("--cv-skill-border",  blendColors(accentRgb, { r: 212, g: 229, b: 243 }, 0.22));
    // color-mix(in srgb, accent 82%, #13354a) — skill chip text
    dom.cvPreview.style.setProperty("--cv-skill-color",   blendColors(accentRgb, { r: 19,  g: 53,  b: 74  }, 0.82));
  }
}

function hexToRgb(hex) {
  // Accepts only 6-digit hex colors (e.g. "#0f5c90"), which is the format
  // enforced by normalizeDesign() and the <input type="color"> element.
  const result = /^#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : null;
}

function blendColors(c1, c2, w1) {
  const r = Math.round(c1.r * w1 + c2.r * (1 - w1));
  const g = Math.round(c1.g * w1 + c2.g * (1 - w1));
  const b = Math.round(c1.b * w1 + c2.b * (1 - w1));
  return `rgb(${r},${g},${b})`;
}

function renderPreviewSection(sectionKey) {
  if (sectionKey === "fullName") {
    const wrapper = document.createElement("section");
    wrapper.className = "cv-section";
    const name = document.createElement("h1");
    name.className = "cv-name";
    name.textContent = state.fullName.trim() || "Your Full Name";
    if (!state.fullName.trim()) name.classList.add("cv-placeholder");
    wrapper.appendChild(name);
    return wrapper;
  }

  if (sectionKey === "jobTitle") {
    const wrapper = document.createElement("section");
    wrapper.className = "cv-section";
    const title = document.createElement("p");
    title.className = "cv-title";
    title.textContent = state.jobTitle.trim() || "Your Job Title";
    if (!state.jobTitle.trim()) title.classList.add("cv-placeholder");
    wrapper.appendChild(title);
    return wrapper;
  }

  if (sectionKey === "links") {
    const wrapper = document.createElement("section");
    wrapper.className = "cv-section";
    const links = [
      { label: "LinkedIn", value: state.linkedin },
      { label: "GitHub", value: state.github }
    ].filter((item) => String(item.value || "").trim());

    if (!links.length) {
      appendPlaceholder(wrapper, "Add LinkedIn and GitHub links.");
      return wrapper;
    }

    const linksWrap = document.createElement("div");
    linksWrap.className = "cv-social-links";
    links.forEach((item) => {
      const link = document.createElement("a");
      link.className = "cv-link";
      link.href = normalizeExternalUrl(item.value);
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = `${item.label}: ${item.value}`;
      linksWrap.appendChild(link);
    });
    wrapper.appendChild(linksWrap);
    return wrapper;
  }

  if (sectionKey === "summary") {
    const wrapper = createTitledSection("Summary");
    appendRichText(wrapper, state.summary, "Add a summary that highlights your strengths and impact.");
    return wrapper;
  }

  if (sectionKey === "experience") {
    const wrapper = createTitledSection("Experience");
    const entries = state.experience.filter((e) => [e.title, e.company, e.date, e.description].some((f) => f.trim()));
    if (!entries.length) {
      appendPlaceholder(wrapper, "Add experience entries to show your work history.");
      return wrapper;
    }
    entries.forEach((entry) => {
      const article = document.createElement("article");
      article.className = "cv-entry";
      const header = document.createElement("div");
      header.className = "cv-entry-header";
      const role = document.createElement("h3");
      role.className = "cv-entry-title";
      role.textContent = entry.title || "Role";
      const date = document.createElement("span");
      date.className = "cv-entry-date";
      date.textContent = entry.date || "";
      header.appendChild(role);
      header.appendChild(date);
      article.appendChild(header);

      if (entry.company) {
        const company = document.createElement("p");
        company.className = "cv-entry-meta";
        company.textContent = entry.company;
        article.appendChild(company);
      }

      appendRichText(article, entry.description, "");
      wrapper.appendChild(article);
    });
    return wrapper;
  }

  if (sectionKey === "education") {
    const wrapper = createTitledSection("Education");
    const entries = state.education.filter((e) => [e.degree, e.school, e.date, e.description].some((f) => f.trim()));
    if (!entries.length) {
      appendPlaceholder(wrapper, "Add education entries to show your academic background.");
      return wrapper;
    }
    entries.forEach((entry) => {
      const article = document.createElement("article");
      article.className = "cv-entry";
      const header = document.createElement("div");
      header.className = "cv-entry-header";
      const degree = document.createElement("h3");
      degree.className = "cv-entry-title";
      degree.textContent = entry.degree || "Degree";
      const date = document.createElement("span");
      date.className = "cv-entry-date";
      date.textContent = entry.date || "";
      header.appendChild(degree);
      header.appendChild(date);
      article.appendChild(header);

      if (entry.school) {
        const school = document.createElement("p");
        school.className = "cv-entry-meta";
        school.textContent = entry.school;
        article.appendChild(school);
      }

      if (entry.description) {
        const description = document.createElement("p");
        description.className = "cv-paragraph";
        description.textContent = entry.description;
        article.appendChild(description);
      }
      wrapper.appendChild(article);
    });
    return wrapper;
  }

  if (sectionKey === "projects") {
    const wrapper = createTitledSection("Projects");
    const entries = state.projects.filter((e) => [e.name, e.stack, e.link, e.achievements].some((f) => f.trim()));
    if (!entries.length) {
      appendPlaceholder(wrapper, "Add project entries to showcase your portfolio.");
      return wrapper;
    }

    entries.forEach((entry) => {
      const article = document.createElement("article");
      article.className = "cv-entry";
      const header = document.createElement("div");
      header.className = "cv-entry-header";
      const title = document.createElement("h3");
      title.className = "cv-entry-title";
      title.textContent = entry.name || "Project";
      header.appendChild(title);
      article.appendChild(header);

      if (entry.stack) {
        const stack = document.createElement("p");
        stack.className = "cv-entry-meta";
        stack.textContent = entry.stack;
        article.appendChild(stack);
      }
      if (entry.link) {
        const link = document.createElement("a");
        link.className = "cv-link";
        link.href = entry.link;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = entry.link;
        article.appendChild(link);
      }

      appendRichText(article, entry.achievements, "");
      wrapper.appendChild(article);
    });
    return wrapper;
  }

  if (sectionKey === "languages") {
    const wrapper = createTitledSection("Languages");
    const entries = state.languages.filter((e) => e.name.trim());
    if (!entries.length) {
      appendPlaceholder(wrapper, "Add language proficiency details.");
      return wrapper;
    }
    const list = document.createElement("div");
    list.className = "cv-languages";
    entries.forEach((entry) => {
      const info = getLanguageLevel(entry.level);
      const row = document.createElement("div");
      row.className = "cv-language-row";
      row.innerHTML = `
        <span class="cv-language-name">${escapeHtml(entry.name)}</span>
        <div class="level-bar"><span style="width:${info.score}%"></span></div>
        <span class="cv-language-level">${info.label}</span>
      `;
      list.appendChild(row);
    });
    wrapper.appendChild(list);
    return wrapper;
  }

  if (sectionKey === "skills") {
    const wrapper = createTitledSection("Skills");
    if (!state.skills.length) {
      appendPlaceholder(wrapper, "Add your core technical and professional skills.");
      return wrapper;
    }
    const skillsWrap = document.createElement("div");
    skillsWrap.className = "cv-skills";
    state.skills.forEach((skill) => {
      const node = document.createElement("span");
      node.className = "cv-skill";
      node.textContent = skill;
      skillsWrap.appendChild(node);
    });
    wrapper.appendChild(skillsWrap);
    return wrapper;
  }

  const customSection = state.customSections.find((section) => section.id === sectionKey);
  if (customSection) {
    const wrapper = createTitledSection(customSection.title.trim() || "Custom Section");
    appendRichText(wrapper, customSection.content, "Add details for this section.");
    return wrapper;
  }

  return null;
}

function appendRichText(parent, text, placeholder) {
  const parsed = parseRichText(text);
  if (!parsed.blocks.length) {
    if (placeholder) appendPlaceholder(parent, placeholder);
    return;
  }
  parsed.blocks.forEach((block) => {
    if (block.type === "list") {
      const ul = document.createElement("ul");
      ul.className = "cv-list";
      block.items.forEach((item) => {
        const li = document.createElement("li");
        li.innerHTML = applyBold(item);
        ul.appendChild(li);
      });
      parent.appendChild(ul);
    } else {
      const p = document.createElement("p");
      p.className = "cv-paragraph";
      p.innerHTML = applyBold(block.text);
      parent.appendChild(p);
    }
  });
}

function parseRichText(value) {
  const lines = String(value || "").split("\n").map((line) => line.trim());
  const blocks = [];
  let bulletBuffer = [];

  lines.forEach((line) => {
    if (line.startsWith("- ")) {
      bulletBuffer.push(line.slice(2));
      return;
    }
    if (bulletBuffer.length) {
      blocks.push({ type: "list", items: [...bulletBuffer] });
      bulletBuffer = [];
    }
    if (line) blocks.push({ type: "paragraph", text: line });
  });

  if (bulletBuffer.length) blocks.push({ type: "list", items: [...bulletBuffer] });
  return { blocks };
}

function applyBold(text) {
  return escapeHtml(text).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

function appendPlaceholder(parent, text) {
  const p = document.createElement("p");
  p.className = "cv-paragraph cv-placeholder";
  p.textContent = text;
  parent.appendChild(p);
}

function createTitledSection(title) {
  const wrapper = document.createElement("section");
  wrapper.className = "cv-section";
  const heading = document.createElement("h2");
  heading.className = "cv-section-title";
  heading.textContent = title;
  wrapper.appendChild(heading);
  return wrapper;
}

function persistAndRenderPreview() {
  saveState();
  renderPreview();
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function exportPdf() {
  const options = {
    margin: [10, 10, 10, 10],
    filename: fileName,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
  };
  html2pdf().set(options).from(dom.cvPreview).save();
}

function exportJson() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${(state.fullName || "cv").trim().replace(/\s+/g, "_")}_data.json`;
  anchor.click();
  URL.revokeObjectURL(url);
  setStatus("JSON exported.");
}

function importJsonFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    state = sanitizeState(safeJsonParse(String(reader.result || "{}")));
    refreshUIFromState("JSON imported.");
  };
  reader.readAsText(file);
  event.target.value = "";
}

async function importExistingCvFile(event) {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) return;

  showToast("Reading CV file...", "info", 1500);

  try {
    const cvText = await extractCvTextFromFile(file);
    if (!cvText.trim()) {
      throw new Error("Could not extract text from this file.");
    }

    showToast("Extracting CV data with AI...", "info", 1500);
    const parsed = AI_DEV_DIRECT_MODE
      ? await requestCvParseDirect(cvText)
      : await requestCvParseViaServer(cvText);

    applyParsedCvData(parsed);
    refreshUIFromState("Existing CV imported.");
    showToast("CV imported successfully.", "success");
  } catch (error) {
    const message = error.message || "Unknown error.";
    showToast(`CV import failed: ${message}`, "error", 5000);
  }
}

async function extractCvTextFromFile(file) {
  const lowerName = String(file.name || "").toLowerCase();
  const mime = String(file.type || "").toLowerCase();

  if (lowerName.endsWith(".pdf") || mime.includes("pdf")) {
    return extractPdfText(file);
  }
  if (lowerName.endsWith(".docx") || mime.includes("wordprocessingml")) {
    return extractDocxText(file);
  }
  if (lowerName.endsWith(".doc")) {
    throw new Error("Legacy .doc files are not supported. Please export as PDF or DOCX.");
  }
  return file.text();
}

async function extractPdfText(file) {
  if (!window.pdfjsLib) {
    throw new Error("PDF parser is not loaded.");
  }
  window.pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";

  const arrayBuffer = await file.arrayBuffer();
  const doc = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let text = "";
  for (let i = 1; i <= doc.numPages; i += 1) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map((item) => item.str).join(" ");
    text += `${pageText}\n`;
  }
  return text;
}

async function extractDocxText(file) {
  if (!window.mammoth?.extractRawText) {
    throw new Error("DOCX parser is not loaded.");
  }
  const arrayBuffer = await file.arrayBuffer();
  const result = await window.mammoth.extractRawText({ arrayBuffer });
  return String(result.value || "");
}

async function requestCvParseViaServer(cvText) {
  const response = await fetch(CV_PARSE_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cvText })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed.");
  return data;
}

async function requestCvParseDirect(cvText) {
  if (!AI_DEV_GROQ_KEY || AI_DEV_GROQ_KEY === "REPLACE_WITH_YOUR_GROQ_API_KEY") {
    throw new Error("Set AI_DEV_GROQ_KEY in script.js for direct mode.");
  }

  const systemPrompt = [
    "Extract structured CV data from raw resume text.",
    "Return strict JSON only (no markdown, no code fences).",
    "Do not invent details.",
    "Use this schema keys:",
    "fullName, jobTitle, linkedin, github, summary, skills, languages, experience, education, projects.",
    "languages is array of {name, level} where level is one of: native,c2,c1,b2,b1,a2,a1 when available.",
    "experience: {title, company, date, description}",
    "education: {degree, school, date, description}",
    "projects: {name, stack, link, achievements}"
  ].join(" ");

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${AI_DEV_GROQ_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      temperature: 0.1,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: cvText.slice(0, 25000) }
      ]
    })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMessage = data?.error?.message || data?.message || "Groq request failed.";
    throw new Error(errorMessage);
  }
  const raw = String(data?.choices?.[0]?.message?.content || "");
  return parseModelJson(raw);
}

function parseModelJson(raw) {
  const clean = raw.trim().replace(/^```json/i, "").replace(/^```/, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(clean);
  } catch {
    throw new Error("AI response could not be parsed as JSON.");
  }
}

function applyParsedCvData(parsed) {
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Invalid parsed CV data.");
  }

  const normalized = sanitizeImportedCv(parsed);
  state.fullName = normalized.fullName;
  state.jobTitle = normalized.jobTitle;
  state.linkedin = normalized.linkedin;
  state.github = normalized.github;
  state.summary = normalized.summary;

  state.skills = normalized.skills;
  state.languages = normalized.languages;
  state.experience = normalized.experience;
  state.education = normalized.education;
  state.projects = normalized.projects;

  state.customSections = [];
  state.hiddenSections = [];
  state.sectionOrder = [...BUILTIN_SECTION_KEYS];
}

function sanitizeImportedCv(candidate) {
  const safe = candidate && typeof candidate === "object" ? candidate : {};

  return {
    fullName: String(safe.fullName || "").trim(),
    jobTitle: String(safe.jobTitle || "").trim(),
    linkedin: String(safe.linkedin || "").trim(),
    github: String(safe.github || "").trim(),
    summary: String(safe.summary || "").trim(),
    skills: Array.isArray(safe.skills)
      ? [...new Set(safe.skills.map((s) => String(s || "").trim()).filter(Boolean))].slice(0, 80)
      : [],
    languages: Array.isArray(safe.languages)
      ? safe.languages.map((entry) => ({
        id: uid("lang"),
        name: String(entry?.name || "").trim(),
        level: normalizeLanguageLevel(entry?.level)
      })).filter((entry) => entry.name)
      : [],
    experience: Array.isArray(safe.experience)
      ? safe.experience.map((entry) => ({
        id: uid("exp"),
        title: String(entry?.title || "").trim(),
        company: String(entry?.company || "").trim(),
        date: String(entry?.date || "").trim(),
        description: String(entry?.description || "").trim()
      })).filter((entry) => entry.title || entry.company || entry.date || entry.description)
      : [],
    education: Array.isArray(safe.education)
      ? safe.education.map((entry) => ({
        id: uid("edu"),
        degree: String(entry?.degree || "").trim(),
        school: String(entry?.school || "").trim(),
        date: String(entry?.date || "").trim(),
        description: String(entry?.description || "").trim()
      })).filter((entry) => entry.degree || entry.school || entry.date || entry.description)
      : [],
    projects: Array.isArray(safe.projects)
      ? safe.projects.map((entry) => ({
        id: uid("proj"),
        name: String(entry?.name || "").trim(),
        stack: String(entry?.stack || "").trim(),
        link: String(entry?.link || "").trim(),
        achievements: String(entry?.achievements || "").trim()
      })).filter((entry) => entry.name || entry.stack || entry.link || entry.achievements)
      : []
  };
}

function normalizeLanguageLevel(value) {
  const level = String(value || "").toLowerCase();
  if (LANGUAGE_LEVELS.some((item) => item.value === level)) return level;
  return "b2";
}

function copyShareLink() {
  const payload = encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(state)))));
  const url = `${window.location.origin}${window.location.pathname}#cv=${payload}`;
  navigator.clipboard.writeText(url).then(
    () => setStatus("Shareable link copied."),
    () => setStatus("Could not copy link.")
  );
}

function applySharedStateFromUrlIfPresent() {
  const hash = window.location.hash || "";
  if (!hash.startsWith("#cv=")) return;
  try {
    const encoded = hash.slice(4);
    const decoded = decodeURIComponent(encoded);
    const json = decodeURIComponent(escape(atob(decoded)));
    const parsed = JSON.parse(json);
    state = sanitizeState(parsed);
  } catch {
    setStatus("Invalid shared URL data.");
  }
}

function refreshUIFromState(status) {
  hydrateInputs();
  renderAllEditors();
  applySectionOrderToEditor();
  ensureBuiltinSectionDeleteButtons();
  initSortables();
  attachAiEnhanceButtons();
  renderPreview();
  if (status) setStatus(status);
}

function loadInitialState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return getDefaultState();
  return sanitizeState(safeJsonParse(raw));
}

function getDefaultState() {
  return {
    sectionOrder: [...BUILTIN_SECTION_KEYS],
    hiddenSections: [],
    customSections: [],
    design: {
      template: "modern",
      accentColor: "#0f5c90",
      font: "jakarta",
      atsMode: false
    },
    fullName: "Alex Johnson",
    jobTitle: "Frontend Developer",
    linkedin: "",
    github: "",
    summary: "Detail-oriented frontend developer with experience building accessible, responsive web interfaces.",
    experience: [
      {
        id: uid("exp"),
        title: "Frontend Developer",
        company: "BrightWorks Studio",
        date: "Jan 2023 - Present",
        description: "- Built reusable UI components\n- Improved page load performance by 28%"
      }
    ],
    education: [
      {
        id: uid("edu"),
        degree: "B.Sc. in Computer Science",
        school: "Cairo University",
        date: "2018 - 2022",
        description: "Focused on software engineering and user-centered design."
      }
    ],
    projects: [
      {
        id: uid("proj"),
        name: "Portfolio Dashboard",
        stack: "HTML, CSS, JavaScript",
        link: "https://example.com",
        achievements: "- Created reusable card system\n- Added analytics widgets"
      }
    ],
    languages: [
      { id: uid("lang"), name: "Arabic", level: "native" },
      { id: uid("lang"), name: "English", level: "c1" }
    ],
    skills: ["HTML", "CSS", "JavaScript", "Responsive Design", "Git"]
  };
}

function sanitizeState(candidate) {
  const fallback = getDefaultState();
  if (!candidate || typeof candidate !== "object") return fallback;
  const hiddenSections = normalizeHiddenSections(candidate.hiddenSections);

  const customSections = Array.isArray(candidate.customSections)
    ? candidate.customSections.map(normalizeCustomSection).filter(Boolean)
    : [];

  const validSections = new Set([...BUILTIN_SECTION_KEYS, ...customSections.map((section) => section.id)]);
  const sectionOrder = Array.isArray(candidate.sectionOrder)
    ? uniqueValidSections(candidate.sectionOrder, validSections)
    : [];

  BUILTIN_SECTION_KEYS.forEach((key) => {
    if (hiddenSections.includes(key)) return;
    if (!sectionOrder.includes(key)) sectionOrder.push(key);
  });
  customSections.forEach((section) => {
    if (!sectionOrder.includes(section.id)) sectionOrder.push(section.id);
  });

  return {
    sectionOrder,
    hiddenSections,
    customSections,
    design: normalizeDesign(candidate.design, fallback.design),
    fullName: String(candidate.fullName ?? fallback.fullName),
    jobTitle: String(candidate.jobTitle ?? fallback.jobTitle),
    linkedin: String(candidate.linkedin ?? fallback.linkedin),
    github: String(candidate.github ?? fallback.github),
    summary: String(candidate.summary ?? fallback.summary),
    experience: normalizeArray(candidate.experience, normalizeExperience, fallback.experience),
    education: normalizeArray(candidate.education, normalizeEducation, fallback.education),
    projects: normalizeArray(candidate.projects, normalizeProject, fallback.projects),
    languages: normalizeArray(candidate.languages, normalizeLanguage, fallback.languages),
    skills: normalizeSkills(candidate.skills, fallback.skills)
  };
}

function normalizeArray(value, mapper, fallback) {
  if (!Array.isArray(value)) return fallback;
  return value.map(mapper).filter(Boolean);
}

function normalizeSkills(value, fallback) {
  if (!Array.isArray(value)) return fallback;
  return value.map((skill) => String(skill || "").trim()).filter(Boolean).slice(0, 80);
}

function normalizeDesign(design, fallback) {
  if (!design || typeof design !== "object") return fallback;
  const allowedTemplates = ["modern", "classic", "minimal"];
  const allowedFonts = ["jakarta", "lato", "nunito"];
  return {
    template: allowedTemplates.includes(design.template) ? design.template : fallback.template,
    accentColor: /^#[0-9a-fA-F]{6}$/.test(String(design.accentColor || "")) ? design.accentColor : fallback.accentColor,
    font: allowedFonts.includes(design.font) ? design.font : fallback.font,
    atsMode: Boolean(design.atsMode)
  };
}

function normalizeHiddenSections(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((section) => BUILTIN_SECTION_KEYS.includes(section));
}

function initToastService() {
  if (toastHost) return;
  toastHost = document.createElement("div");
  toastHost.className = "toast-stack";
  toastHost.setAttribute("aria-live", "polite");
  toastHost.setAttribute("aria-atomic", "true");
  document.body.appendChild(toastHost);
}

function showToast(message, type = "info", duration = 3200) {
  if (!message) return;
  if (!toastHost) initToastService();

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toastHost.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add("show");
  });

  window.setTimeout(() => dismissToast(toast), duration);
}

function dismissToast(toast) {
  if (!toast || !toast.parentElement) return;
  toast.classList.remove("show");
  window.setTimeout(() => {
    if (toast.parentElement) toast.parentElement.removeChild(toast);
  }, 180);
}

function uniqueValidSections(order, validSections) {
  const seen = new Set();
  const clean = [];
  order.forEach((item) => {
    if (!validSections.has(item)) return;
    if (seen.has(item)) return;
    seen.add(item);
    clean.push(item);
  });
  return clean;
}

function normalizeCustomSection(entry) {
  if (!entry || typeof entry !== "object") return null;
  return { id: String(entry.id || uid("custom")), title: String(entry.title || ""), content: String(entry.content || "") };
}

function normalizeExperience(entry) {
  if (!entry || typeof entry !== "object") return null;
  return {
    id: String(entry.id || uid("exp")),
    title: String(entry.title || ""),
    company: String(entry.company || ""),
    date: String(entry.date || ""),
    description: String(entry.description || "")
  };
}

function normalizeEducation(entry) {
  if (!entry || typeof entry !== "object") return null;
  return {
    id: String(entry.id || uid("edu")),
    degree: String(entry.degree || ""),
    school: String(entry.school || ""),
    date: String(entry.date || ""),
    description: String(entry.description || "")
  };
}

function normalizeProject(entry) {
  if (!entry || typeof entry !== "object") return null;
  return {
    id: String(entry.id || uid("proj")),
    name: String(entry.name || ""),
    stack: String(entry.stack || ""),
    link: String(entry.link || ""),
    achievements: String(entry.achievements || "")
  };
}

function normalizeLanguage(entry) {
  if (!entry || typeof entry !== "object") return null;
  const level = String(entry.level || "b2").toLowerCase();
  return {
    id: String(entry.id || uid("lang")),
    name: String(entry.name || ""),
    level: LANGUAGE_LEVELS.some((item) => item.value === level) ? level : "b2"
  };
}

function createExperienceEntry() {
  return { id: uid("exp"), title: "", company: "", date: "", description: "" };
}

function createEducationEntry() {
  return { id: uid("edu"), degree: "", school: "", date: "", description: "" };
}

function createProjectEntry() {
  return { id: uid("proj"), name: "", stack: "", link: "", achievements: "" };
}

function createLanguageEntry() {
  return { id: uid("lang"), name: "", level: "b2" };
}

function getLanguageLevel(value) {
  return LANGUAGE_LEVELS.find((item) => item.value === value) || LANGUAGE_LEVELS[3];
}

function normalizeExternalUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "#";
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://${raw}`;
}

function setStatus(message) {
  dom.statusMessage.textContent = message;
  window.clearTimeout(setStatus.timeoutId);
  setStatus.timeoutId = window.setTimeout(() => {
    dom.statusMessage.textContent = "";
  }, 2500);
}

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function uid(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}










