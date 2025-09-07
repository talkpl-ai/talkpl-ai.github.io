// Component loader and dynamic imports
(() => {
    function resolvePaths() {
        // Robustly resolve using absolute URLs
        const currentScript = document.currentScript || (function () {
            const scripts = document.getElementsByTagName('script');
            return scripts[scripts.length - 1];
        })();

        const scriptUrl = new URL(currentScript.src || currentScript.getAttribute('src'), document.baseURI);
        const scriptDirUrl = new URL('.', scriptUrl);
        const pageDirUrl = new URL('.', document.baseURI);

        function relativeFromTo(fromUrl, toUrl) {
            const fromParts = fromUrl.pathname.split('/').filter(Boolean);
            const toParts = toUrl.pathname.split('/').filter(Boolean);
            let i = 0;
            while (i < fromParts.length && i < toParts.length && fromParts[i] === toParts[i]) i++;
            const upCount = fromParts.length - i;
            const downParts = toParts.slice(i);
            const up = upCount > 0 ? '../'.repeat(upCount) : '';
            const down = downParts.length ? downParts.join('/') + '/' : '';
            return up + down;
        }

        const baseRel = relativeFromTo(pageDirUrl, scriptDirUrl);
        return { baseRel, scriptDirUrl };
    }

    async function fetchComponent(url) {
        const res = await fetch(url.toString());
        if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
        return res.text();
    }

    function injectBase(html, base) {
        // Replace %BASE% placeholders for links and assets in components
        return html.replace(/%BASE%/g, base);
    }

    function mount(targetSelector, html) {
        const el = document.querySelector(targetSelector);
        if (el) el.innerHTML = html;
    }

    async function mountHeaderFooter() {
        const { baseRel, scriptDirUrl } = resolvePaths();

        const [headerHtmlRaw, footerHtmlRaw] = await Promise.all([
            fetchComponent(new URL('components/header.html', scriptDirUrl)),
            fetchComponent(new URL('components/footer.html', scriptDirUrl)),
        ]);

        function unwrap(html, expectedTag) {
            const doc = new DOMParser().parseFromString(html, 'text/html');
            const first = doc.body.firstElementChild;
            if (first && first.tagName && first.tagName.toLowerCase() === expectedTag) {
                return first.innerHTML;
            }
            return html;
        }

        const headerTarget = document.querySelector('header.site-header, #header-mount');
        if (headerTarget) {
            const content = unwrap(headerHtmlRaw, 'header');
            headerTarget.innerHTML = injectBase(content, baseRel);
        }

        const footerTarget = document.querySelector('footer.site-footer, #footer-mount');
        if (footerTarget) {
            const content = unwrap(footerHtmlRaw, 'footer');
            footerTarget.innerHTML = injectBase(content, baseRel);
        }
    }

    async function mountProjectsPreview() {
        const { scriptDirUrl } = resolvePaths();
        const mountEl = document.getElementById('projects-mount');
        if (!mountEl) return;
        const html = await fetchComponent(new URL('components/projects.html', scriptDirUrl));
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const header = doc.querySelector('header.site-header');
        if (header) header.remove();
        const footer = doc.querySelector('footer.site-footer');
        if (footer) footer.remove();
        const main = doc.querySelector('main');
        mountEl.innerHTML = main ? main.innerHTML : doc.body.innerHTML;
    }

    async function mountTeamPreview() {
        const { scriptDirUrl } = resolvePaths();
        const mountEl = document.getElementById('team-mount');
        if (!mountEl) return;
        const html = await fetchComponent(new URL('components/team.html', scriptDirUrl));
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const header = doc.querySelector('header.site-header');
        if (header) header.remove();
        const footer = doc.querySelector('footer.site-footer');
        if (footer) footer.remove();
        const teamSection = doc.querySelector('section.team');
        const main = doc.querySelector('main');
        mountEl.innerHTML = teamSection ? teamSection.outerHTML : (main ? main.innerHTML : doc.body.innerHTML);
    }

    function initProjectVideoSwitcher() {
        const iframe = document.getElementById('demo-iframe');
        const buttons = document.querySelectorAll('.project-buttons button[data-project]');
        if (!iframe || !buttons.length || typeof project_to_url === 'undefined') return;

        function setActive(project) {
            buttons.forEach(b => b.classList.toggle('active', b.dataset.project === project));
        }

        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                const project = btn.dataset.project;
                const url = project_to_url[project];
                if (url) {
                    iframe.src = url;
                    setActive(project);
                }
            });
        });

        let initialProject = Array.from(buttons).find(
            b => project_to_url[b.dataset.project] === iframe.src
        )?.dataset.project;

        if (!initialProject && buttons[0]) {
            initialProject = buttons[0].dataset.project;
            const initialUrl = project_to_url[initialProject];
            if (initialUrl) iframe.src = initialUrl;
        }
        if (initialProject) setActive(initialProject);
    }

    function onReady(fn) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', fn, { once: true });
        } else {
            fn();
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        // Year stamp
        const yearEl = document.getElementById('year');
        if (yearEl) yearEl.textContent = new Date().getFullYear();

        // Mount shared components
        mountHeaderFooter().catch(err => console.error(err));

        // Optional dynamic sections
        mountProjectsPreview().catch(err => console.error(err));
        mountTeamPreview().catch(err => console.error(err));

        // Homepage video switcher (initialize once DOM is ready)
        onReady(() => initProjectVideoSwitcher());
    });
})();


