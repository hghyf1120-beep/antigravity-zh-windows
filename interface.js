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
    const fixedControls = [
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
    const scopes = [settings, nav, group, topMenu, greeting, project, fixedControls, menuItem].join(",");
    const ignore = [
        "pre", "code", "script", "style", "textarea", "input", "iframe", "webview",
        "[contenteditable]:not([contenteditable=false])", "[data-markdown-root]", ".prose",
        "[data-testid*=transcript]", "[data-testid=user-message]", "[data-testid=agent-response]",
        "[data-testid=conversation-view]", "[data-testid=user-input-step]", "[data-testid*=inline-edit]",
        "[role=treeitem]", "[role=textbox]", "[data-testid*=project-name]",
        "[data-testid*=conversation-title]"
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
        if (element.closest(settings)) return true;
        if (element.closest(group)) return headers.has(value);
        if (element.closest(greeting)) return true;
        if (element.closest(project)) return value === "No Project";
        if (element.closest(nav) && !element.closest(".overflow-y-auto")) return sidebarLabels.has(value);
        if (element.closest(topMenu) || element.closest(fixedControls)) return true;
        return ["Copy", "Fork", "View Debug"].includes(value) &&
            !!element.closest(menuItem)?.closest(conversationMenu);
    }

    function translateText(node) {
        const parent = node.parentElement;
        if (!parent || parent.closest(ignore)) return;
        const raw = node.data;
        const key = raw.trim();
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
        if (labels.has(key) && (accepts(parent, key) || (isHint(key) && parent.closest(hint)))) {
            node.data = raw.replace(key, labels.get(key));
        }
    }

    function translateAttrs(el) {
        // Settings fields may expose a label or hint even when their value is editable.
        if (el.matches("input,textarea,[role=slider]") && el.closest(settings)) {
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
        if (el.closest(ignore)) return;
        if (el.closest(settings)) {
            for (const attr of attributes) {
                const value = el.getAttribute(attr);
                const translated = settingsText(value);
                if (translated && translated !== value) el.setAttribute(attr, translated);
            }
            return;
        }
        if (!el.matches("button,a,[role=button],[role=tab],[role=dialog],label")) return;
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
        if (el.closest(settings)) {
            for (const field of el.querySelectorAll("input,textarea,[role=slider]")) translateAttrs(field);
        }
        if (el.closest(ignore)) return;
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
        translateAttrs(node);
        if (node.closest(ignore)) return;
        if (node.closest(scopes)) { region(node); return; }
        if (node.matches(hint) && isHint(node.textContent.trim())) region(node);
        for (const el of node.querySelectorAll(scopes + "," + hint)) {
            if (el.closest(ignore)) continue;
            if (el.matches(hint) && !el.matches(scopes) && !isHint(el.textContent.trim())) continue;
            if (!el.parentElement?.closest(scopes)) region(el);
        }
        for (const btn of node.querySelectorAll("button[aria-label],button[title],[data-placeholder],[aria-placeholder],textarea[placeholder]")) {
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
