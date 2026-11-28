// Inserted into the existing Hub preload's isolated world. No IPC or network access.
;(() => {
    if (!process.isMainFrame || isRemoteWindow || location.protocol !== "https:" ||
        location.hostname !== "127.0.0.1" || !location.port) return;

    const labels = new Map(/* LOCAL_DICTIONARY */);
    const settings = ".settings-modal-container";
    const nav = ".bg-sidebar :is(a,button).agy-button.flex-grow.justify-start";
    const group = ".bg-sidebar .opacity-50.font-medium.select-none";
    const topMenu = '[data-testid="title-menu-bar-item"],[data-testid="title-menu-bar-option"]';
    // Target application-owned controls. Conversation titles, group names and plugin names
    // can contain exactly the same words as a command and must keep their original text.
    // Match owned fields and labels, including menus mounted outside their parent page.
    const fields = [
        '[data-testid="new-tab-search-input"]',
        '[data-testid="customizations-search"]', '[data-testid="project-selector-search"]',
        '[data-testid="project-selector-ssh-host-search"]', '[data-testid="new-sidecar-modal"]',
        '[data-testid="sidecars-view"]', '[data-testid="model-selector-panel"]',
        'form:has(input[placeholder="Enter project name..."])', 'input[placeholder="Enter project name..."]'
    ].join(",");
    const projectWizard = '[role="dialog"]:has([data-testid="project-folder-selection-step"],input[placeholder="Enter project name..."],input[placeholder="输入项目名称…"])';
    const environmentButton = 'button:is([aria-label="Select Environment"],[aria-label="选择环境"])';
    const projectActions = '.origin-top-left.overflow-hidden.flex.flex-col';
    const locationCommands = new Set(["Local Checkout", "New Workspace", "New Worktree", "Unknown Environment"]);
    const projectCommands = new Set(["New Project", "New Workspace", "SSH Host…", "Remote Project", "Existing Folder…"]);
    const tooltipLabels = new Set(["Toggle Side Panel", "Toggle Overview Panel", "Toggle Maximize Side Panel", "Customize Sections", "New Tab",
        "Send a message in the main conversation first to start a side question",
        "Select Model", "Select Project", "Settings", "Customizations", "Automations", "New Conversation",
        "Create New Project", "Display Options", "Search Conversations", "Toggle Sidebar", "Go Back", "Go Forward",
        "Offloads routine steps to a faster executor. Same quality, fewer tokens used.",
        "Select Environment", "Add context", "More options", "Create a new project from one or more folders.",
        "Create a project on a machine you reach over SSH. It opens in that host's own window."]);
    const changedHeader = '[data-testid="changed-files-card-header"]';
    const reviewLabels = changedHeader + ' :is(span.text-secondary-foreground.truncate,button[data-testid="changed-files-card-review"] span)';
    const composer = [environmentButton,'[data-testid="model-selector-trigger"]','[data-testid="permissions-selector-trigger"]',
        '[data-testid="location-selector-trigger"]', '[data-testid="project-selector-trigger"]'].join(",");
    const panels = ':is([data-testid="overview-panel"],[data-testid="side-panel-new-tab-view"])';
    // Section headings and action labels share a container with arbitrary report and task titles.
    const panelControls = [
        panels + ' .agy-hover-label.select-none.font-medium', panels + ' button.inline-flex[aria-expanded]',
        '[data-testid^="overview-panel-row-"] > .agy-hover-label', '[data-testid="overview-panel-customize-trigger"]',
        '[data-testid="new-tab-search-clear"]', '[data-testid^="new-tab-group-"]',
        '[data-testid="side-panel-new-tab-view"] div.text-muted-foreground.px-3:only-child',
        '[role="menu"]:has([data-testid^="plugins-submenu-"]) .font-medium.select-none',
        ...["review","open-file","new-terminal","new-preview","side-question","extensions"].map(id => '[data-testid="new-tab-card-' + id + '"]'),
        '[data-testid="side-panel-new-tab-button"]', '[data-testid="side-panel-plus-open-file"]',
        '[role="menu"]:has([data-testid="side-panel-plus-open-file"]) [role="menuitem"]:not([data-testid])'
    ].join(",");
    const sectionMenu = '[role="menu"]:has([role="menuitemcheckbox"])';
    function isSectionMenu(el) {
        const menu = el.closest(sectionMenu);
        const heading = menu?.querySelector('.font-medium.select-none');
        return heading && ["Customize Sections", labels.get("Customize Sections")].includes(heading.textContent.trim());
    }
    const fixedControls = [
        '[data-testid^="schedule-"][data-testid$="-option"]', '[data-testid="schedule-editor-panel"]',
        '[data-testid="automation-schedule-editor"]', '[data-testid="featured-carousel"] .agy-spotlight-panel p',
        '[data-testid="featured-carousel"] .agy-spotlight-panel a', '[data-testid="featured-carousel-eyebrow"]',
        '[data-testid="customizations-marketplace"] [data-testid="customization-card"] .text-muted-foreground.truncate',
        '[data-testid="marketplace-footer"]', '.mark-all-read-menu-item', '[data-testid="filter-mark-all-read"]',
        '[data-testid="model-selector-panel"] [role="menuitem"]:has(.flex-1)',
        '[data-testid="sidecars-view"] h1', '[data-testid="sidecar-list-empty"] p',
        '[data-testid="sidecar-new-button"]', '[data-testid="sidecar-create-with-prompt"]',
        '[data-testid="new-sidecar-modal"]', '[data-testid="automation-settings"] :is(h2,h3,button.agy-button)',
        '[data-testid="automation-instructions"] :is(h2,h3)', '[data-testid="automation-runs"] :is(h2,h3)',
        '[data-testid^="sidecar-action-"]', '[data-testid="sidecar-detail-run-now"]',
        '[data-testid="automation-run-now"]', '[data-testid="automation-settings-edit"]',
        '[data-testid="automation-settings-save"]', '[data-testid="automation-settings-cancel"]',
        '[data-testid="automation-instructions-edit"]', '[data-testid="cancel-delete-sidecar"]',
        '[data-testid="confirm-delete-sidecar"]', '[data-testid="plugins-tabs"]',
        '.sticky:has([data-testid="plugins-tabs"]) h1', '[data-testid="marketplace-filter-button"]',
        '[data-testid="marketplace-filter-menu"]', '[data-testid="marketplace-ranking-label"]',
        '[data-testid="customizations-marketplace"] :is(h2,p,button.agy-button)',
        '[data-testid="marketplace-bundles-banner"]',
        '[data-testid="customizations-installed"] section > div:first-child :is(h3,button.agy-button)',
        '[data-testid="customizations-empty-state"]', '[data-testid="customizations-empty-state"] ~ a',
        '[data-testid="customizations-marketplace-error"]', '[data-testid="plugins-create-with-prompt"]',
        '[data-testid="plugin-detail-footer"] button.agy-button', '[data-testid="plugin-detail-added-badge"]',
        '[data-testid="project-folder-selection-step"] > .text-secondary-foreground',
        '[data-testid="project-folder-selection-step"] button.agy-button', '[data-testid="project-location-toggle"]',
        'form:has(input:is([placeholder="Enter project name..."],[placeholder="输入项目名称…"])) .text-secondary-foreground',
        'form:has(input:is([placeholder="Enter project name..."],[placeholder="输入项目名称…"])) .text-red-500',
        'form:has(input:is([placeholder="Enter project name..."],[placeholder="输入项目名称…"])) button',
        projectWizard + ' :is(h1,h2,h3,label,button.agy-button)',
        '[data-testid="project-selector-create-project-trigger"]', '[data-testid="project-selector-new-workspace"]',
        '[data-testid="project-selector-new-remote-project"]', '[data-testid="project-selector-connect-github"]',
        '[data-testid="project-selector-configure-github-app"]','[data-testid="project-selector-connect-ssh-host"]',
        '[data-testid="project-selector-github-loading"]', '[data-testid="customize-sidebar-menu"]',
        '[role="menuitem"]:has([data-testid$="-submenu-trigger"])', '[data-testid^="group-by-option-"]',
        '[data-testid^="sort-option-"]', '[data-testid^="folder-sort-option-"]', '[data-testid^="view-option-"]',
        '[data-testid^="filter-option-"]', '[data-testid^="subtitle-option-"]',
        '[data-testid="model-selector-effort-group"] + span', '[data-testid="model-selector-panel"] [data-tooltip-id].rounded-full',
        '[data-testid="model-selector-panel"] span.flex-1.text-sm', '[data-testid="model-selector-header"]', '[data-testid="model-selector-empty"]',
        '[data-testid="model-selector-refresh"]', '[data-testid="model-selector-loading"]',
        '[data-testid="model-selector-add-custom-model"]', '[data-testid="model-selector-orchestrator"]',
        '[data-testid="model-selector-effort-header"]', '[data-testid="model-selector-effort-option"]',
        '[data-testid="model-selector-panel"] a', changedHeader, composer,
        '[data-testid="permissions-selector-trigger"]', '[data-testid="permissions-menu"]',
        '[data-testid="location-selector-trigger"]', '[data-testid="location-local"]',
        '[data-testid="location-cloud"]', '[data-testid="plugins-submenu-trigger"]',
        '[data-testid="plugins-submenu-empty"]', 'button[data-testid^="suggested-action-row-"]',
        '[data-testid^="conversation-"][data-testid$="-menu-item"]',
        '[data-testid="conversation-split-submenu"]', '[data-testid^="conversation-copy-"]',
        '[data-testid^="conversation-split-"]', '[data-testid="conversation-groups-submenu"]',
        '[data-testid="conversation-groups-new"]', '[data-testid="conversation-groups-remove"]'
    ].join(",");
    const conversationMenu = '[role="menu"]:has([data-testid="conversation-delete-menu-item"])';
    const menuItem = '[role="menuitem"]';
    const greeting = ".home-greeting-title";
    const project = 'button[aria-label^="Select project, current:"],button[aria-label^="选择项目，当前："]';
    const hint = ".pointer-events-none";
    const scopes = [settings, nav, group, topMenu, greeting, project, fixedControls, panelControls, sectionMenu, projectActions, menuItem, '[role="option"]', '[role="tooltip"]'].join(",");
    const ignore = [
        "pre", "code", "script", "style", "textarea", "input", "iframe", "webview",
        "[contenteditable]:not([contenteditable=false])", "[data-markdown-root]", ".prose",
        "[data-testid*=transcript]", "[data-testid=user-message]", "[data-testid=agent-response]",
        "[data-testid=user-input-step]", "[data-testid*=inline-edit]",
        "[role=treeitem]", "[role=textbox]", "[data-testid*=project-name]",
        "[data-testid*=conversation-title]", "[data-testid=model-selector-orchestrator-model]",
        "[data-testid=automation-name]", "[data-testid=automation-instructions-text]",
        "[data-testid=automation-instructions-markdown]", "[data-testid=new-sidecar-project] button",
        "[data-testid=new-sidecar-summary]", "[data-testid=new-sidecar-name-exists]",
        "[data-testid=project-selector-item]", "[data-testid=project-selector-github-repo-item]"
    ].join(",");
    const sidebarLabels = new Set(["New Conversation", "Automations", "Customizations", "Settings", "Home"]);
    const headers = new Set(["Projects", "Conversations"]);
    const attributes = ["title", "aria-label", "placeholder", "data-placeholder", "aria-placeholder"];
    const tools = new Set(["Display Options", "Create New Project", "Search Conversations",
        "Toggle Sidebar", "Toggle Side Panel", "Toggle Overview Panel", "Go Back", "Go Forward",
        "New Conversation", "Add context", "Start Voice mode", "Dismiss suggestion",
        "More actions", "More options", "Archive conversation", "Pin conversation",
        "Unpin conversation", "Record voice memo"]);

    function isHint(s) { return s.startsWith("Ask anything") && labels.has(s); }
    function greetingText(raw) {
        return raw.replace(/^Hey there, what should we build today\?$/, "你好，今天想做点什么？")
            .replace(/^Hey (.+), what should we build today\?$/, "你好，$1。今天想做点什么？")
            .replace(/^Good to see you, (.+)\. What's next\?$/, "很高兴见到你，$1。接下来想做什么？")
            .replace(/^Good to see you\. What's next\?$/, "很高兴见到你。接下来想做什么？")
            .replace(/^Welcome back\. Where should we pick up\?$/, "欢迎回来。想从哪里继续？")
            .replace(/^Welcome back, (.+?)\. Where should we pick up\?$/, "欢迎回来，$1。想从哪里继续？")
            .replace(/^Welcome back,\s*$/, "欢迎回来，").replace(/^\. Where should we pick up\?$/, "。想从哪里继续？");
    }

    // Localize variable key bindings and quota durations only inside Settings.
    function settingsText(key) {
        if (!key) return null;
        if (labels.has(key)) return labels.get(key);
        const add = /^Add shortcut for (.+)$/.exec(key);
        if (add && labels.has(add[1])) return "为「" + labels.get(add[1]) + "」添加快捷键";
        const binding = /^(Remove shortcut|Shortcut) (.{1,36}) for (.+)$/.exec(key);
        if (binding && labels.has(binding[3])) {
            const prefix = binding[1] === "Shortcut" ? "" : "移除";
            return prefix + "「" + labels.get(binding[3]) + "」的快捷键 " + binding[2];
        }
        const quota = /^You have used some of your (5-hour|weekly) limit, it will fully refresh in (.+?)\.$/.exec(key);
        if (quota && /^\d+ (?:days?|hours?|minutes?|seconds?)(?:, \d+ (?:days?|hours?|minutes?|seconds?))*$/.test(quota[2])) {
            const duration = quota[2].replace(/ days?/g, " 天").replace(/ hours?/g, " 小时")
                .replace(/ minutes?/g, " 分钟").replace(/ seconds?/g, " 秒").replace(/, /g, " ");
            return "已使用部分" + (quota[1] === "weekly" ? "每周" : "五小时") + "配额，将在 " + duration + "后完全恢复。";
        }
        const breakdown = /^Show (\d+) breakdowns?$/.exec(key);
        return breakdown ? "查看 " + breakdown[1] + " 项明细" : null;
    }

    function accepts(element, value) {
        if (element.closest(panelControls) || isSectionMenu(element)) return true;
        if (element.closest(settings)) return true;
        if (element.closest('[role="tooltip"]')) return tooltipLabels.has(value);
        if (projectCommands.has(value) && element.closest(projectActions) &&
            document.querySelector('[data-testid="sidebar-add-project-button"][aria-expanded="true"]')) return true;
        if (element.closest(environmentButton)) return locationCommands.has(value) || value === "Select Environment";
        if (element.closest(group)) return headers.has(value);
        if (element.closest(greeting)) return true;
        if (element.closest(project) || element.closest('[data-testid="project-selector-trigger"]')) return value === "No Project";
        if (element.closest('[data-testid="model-selector-trigger"]')) return value === "Orchestrator";
        if (element.closest(nav) && !element.closest(".overflow-y-auto")) return sidebarLabels.has(value);
        if (element.closest(topMenu) || element.closest(fixedControls)) return true;
        return ["Copy", "Fork", "View Debug"].includes(value) &&
            !!element.closest(menuItem)?.closest(conversationMenu);
    }

    // A conversation can contain a fixed composer and review bar alongside user content.
    function outsideControls(el) {
        return el.closest(ignore) || (el.closest('[data-testid="conversation-view"]') &&
            !el.closest(changedHeader) && !el.closest(composer) && !el.closest(hint) && !el.closest(panelControls));
    }

    function scheduleOption(el) {
        return el.closest('[role="option"]') &&
            document.querySelector('[data-testid^="schedule-"][aria-expanded="true"]');
    }
    // The application renders its review summary inside the transcript. Only these two
    // owned leaves can be localized there; the surrounding messages may contain identical text.
    function reviewText(node) {
        const el = node.parentElement;
        if (!el?.matches(reviewLabels) || !el.closest('[data-testid="changed-files-card"]')) return;
        const raw = node.data;
        const key = raw.trim();
        const count = /^([0-9]+) files? changed$/.exec(key);
        if (count) node.data = raw.replace(key, "已更改 " + count[1] + " 个文件");
        else if (key === "Review" && el.closest('[data-testid="changed-files-card-review"]')) node.data = raw.replace(key, "审阅");
    }

    function translateText(node) {
        const parent = node.parentElement;
        if (!parent) return;
        if (parent.closest(changedHeader)) { reviewText(node); return; }
        if (outsideControls(parent)) return;
        const raw = node.data;
        const key = raw.trim();
        if (key === "New" && parent.closest('[data-testid="model-selector-panel"]')) {
            node.data = raw.replace(key, "新上线"); return;
        }
        const inScheduleList = scheduleOption(parent);
        if (inScheduleList && labels.has(key)) {
            node.data = raw.replace(key, labels.get(key)); return;
        }
        if (inScheduleList || parent.closest('[data-testid="schedule-time"],[data-testid="schedule-time-option"]')) {
            const time = /^(\d{1,2}:\d{2}) (AM|PM)$/.exec(key);
            if (time) { node.data = raw.replace(key, (time[2] === "AM" ? "上午 " : "下午 ") + time[1]); return; }
        }
        if (parent.closest('[data-testid="sidecar-list-empty"] > p') &&
            ["No ", "automations", " yet"].includes(raw)) {
            node.data = {"No ": "暂无", "automations": "自动化任务", " yet": ""}[raw];
            return;
        }
        if (parent.closest('[data-testid="title-menu-bar-option"]') && /^Version \d[\d.\-+a-zA-Z]*$/.test(key)) {
            node.data = raw.replace("Version ", "版本 ");
            return;
        }
        if (parent.closest(settings)) {
            const value = settingsText(key);
            if (value && value !== key) node.data = raw.replace(key, () => value);
            return;
        }
        if (parent.closest(greeting)) {
            const translated = greetingText(raw);
            if (translated !== raw) { node.data = translated; return; }
        }
        if (parent.closest('[role="menuitem"],[role="option"]') && locationCommands.has(key) &&
            document.querySelector(environmentButton + '[aria-expanded="true"]')) {
            node.data = raw.replace(key, labels.get(key) || key); return;
        }
        if (labels.has(key) && (accepts(parent, key) || (isHint(key) && parent.closest(hint)))) {
            node.data = raw.replace(key, labels.get(key));
        }
    }

    function translateAttrs(el) {
        // Settings fields may expose a label or hint even when their value is editable.
        if (el.matches("input,textarea,[role=slider]") && (el.closest(settings) || el.closest(fields))) {
            for (const attr of attributes) {
                const value = labels.get(el.getAttribute(attr));
                if (value) el.setAttribute(attr, value);
            }
            return;
        }
        if (el.matches("textarea,[contenteditable=true],[role=textbox]")) {
            for (const attr of ["placeholder","aria-placeholder","data-placeholder"]) {
                const key = el.getAttribute(attr);
                if (key && isHint(key)) el.setAttribute(attr, labels.get(key));
            }
            return;
        }
        if (outsideControls(el)) return;
        if (el.closest('[data-testid="customizations-marketplace"],[data-testid="featured-carousel"]')) {
            for (const attr of ["title","aria-label"]) {
                const value = el.getAttribute(attr);
                if (!value) continue;
                const action = /^(Install|Details for|See more in|See less in) (.+)$/.exec(value);
                if (action) {
                    const prefix = {"Install":"安装 ","Details for":"查看详情：","See more in":"展开更多：","See less in":"收起："};
                    el.setAttribute(attr, prefix[action[1]] + (action[1].includes(" in") ? (labels.get(action[2]) || action[2]) : action[2]));
                } else if (el.matches('[data-testid="featured-carousel-description"],[data-testid="customization-card"] [title]') && labels.has(value)) {
                    el.setAttribute(attr, labels.get(value));
                }
            }
        }
        if (el.closest(settings)) {
            for (const attr of attributes) {
                const value = el.getAttribute(attr);
                const translated = settingsText(value);
                if (translated && translated !== value) el.setAttribute(attr, translated);
            }
            return;
        }
        if (!el.matches("button,a,[role=button],[role=tab],[role=dialog],[data-testid=model-selector-effort-info],label")) return;
        for (const attr of attributes) {
            const key = el.getAttribute(attr);
            if (attr === "aria-label" && el.matches('[data-testid="permissions-selector-trigger"]') &&
                key?.startsWith("Agent permissions preset selector, current: ")) {
                const name = key.slice("Agent permissions preset selector, current: ".length);
                el.setAttribute(attr, "智能体权限，当前：" + (labels.get(name) || name));
            } else if (attr === "aria-label" && el.matches('[data-testid="location-selector-trigger"]') &&
                key?.startsWith("Where the agent runs, current: ")) {
                const name = key.slice("Where the agent runs, current: ".length);
                el.setAttribute(attr, "智能体运行位置，当前：" + (labels.get(name) || name));
            } else if (attr === "aria-label" && el.matches("button") && key?.startsWith("Select model, current: ")) {
                el.setAttribute(attr, key.replace("Select model, current: ", "选择模型，当前："));
            } else if (attr === "aria-label" && el.matches(project) && key?.startsWith("Select project, current: ")) {
                const name = key.slice("Select project, current: ".length);
                el.setAttribute(attr, "选择项目，当前：" + (name === "No Project" ? "无项目" : name));
            } else if (labels.has(key) && (accepts(el, key) || (el.matches("button") && tools.has(key)))) {
                el.setAttribute(attr, labels.get(key));
            }
        }
    }

    function region(el) {
        if (el.closest(settings) || el.closest(fields)) {
            for (const field of el.querySelectorAll("input,textarea,[role=slider]")) translateAttrs(field);
        }
        if (outsideControls(el)) return;
        translateAttrs(el);
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
            acceptNode(n) {
                return n.nodeType === 1 && n.matches(ignore) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
            }
        });
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
            if (node.nodeType === 3) translateText(node);
            else translateAttrs(node);
        }
    }

    function visit(node) {
        if (node.nodeType === 3) { translateText(node); return; }
        if (node.nodeType !== 1) return;
        // A whole transcript may arrive as one mutation. Visit review labels before pruning it.
        for (const leaf of node.querySelectorAll(reviewLabels)) {
            for (const child of leaf.childNodes) if (child.nodeType === 3) reviewText(child);
        }
        if (node.closest(changedHeader)) {
            for (const child of node.childNodes) if (child.nodeType === 3) reviewText(child);
        }
        translateAttrs(node);
        if (node.closest(ignore)) return;
        if (node.closest(scopes) && !outsideControls(node)) { region(node); return; }
        if (node.matches(hint) && isHint(node.textContent.trim())) region(node);
        for (const el of node.querySelectorAll(scopes + "," + hint)) {
            if (el.closest(ignore)) continue;
            if (el.matches(hint) && !el.matches(scopes) && !isHint(el.textContent.trim())) continue;
            if (!el.parentElement?.closest(scopes)) region(el);
        }
        for (const btn of node.querySelectorAll("button[aria-label],button[title],[data-placeholder],[aria-placeholder],textarea[placeholder],input[placeholder]")) {
            translateAttrs(btn);
        }
    }

    function start() {
        // Menus render in portals alongside #root and can open after the initial scan.
        const root = document.body;
        if (!root) return;
        visit(root);
        new MutationObserver(changes => {
            const added = new Set();
            for (const change of changes) {
                if (change.type === "attributes") translateAttrs(change.target);
                else if (change.type === "characterData") translateText(change.target);
                else for (const node of change.addedNodes) added.add(node);
            }
            for (const node of added) {
                if (node.isConnected && !added.has(node.parentNode)) visit(node);
            }
        }).observe(root, {subtree: true, childList: true, characterData: true,
            attributes: true, attributeFilter: attributes});
    }
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, {once: true});
    else start();
})();
