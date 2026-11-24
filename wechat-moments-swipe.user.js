// ==UserScript==
// @name         微信朋友圈滑动浏览
// @name:en      WeChat Moments Swipe
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  为微信网页版朋友圈添加视频号式的滑动浏览体验，支持划走内容但不屏蔽好友
// @description:en Add TikTok-style swipe browsing to WeChat Web Moments
// @author       You
// @match        https://wx.qq.com/*
// @match        https://web.wechat.com/*
// @match        https://web2.wechat.com/*
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    // ===== Configuration =====
    const CONFIG = {
        swipeThreshold: 50,        // 滑动触发阈值
        animationDuration: 300,  // 动画时长
        cardScale: 0.9,           // 卡片缩放比例
        debug: false
    };

    // ===== State Management =====
    const state = {
        isActive: false,
        currentIndex: 0,
        moments: [],
        skippedIds: new Set(),   // 本次会话跳过的内容ID
        isAnimating: false
    };

    // ===== Logger =====
    const log = (...args) => CONFIG.debug && console.log('[WeChatSwipe]', ...args);

    // ===== CSS Styles =====
    const STYLES = `
        .wc-swipe-container {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            z-index: 999999 !important;
            background: #000 !important;
            display: none;
            overflow: hidden;
        }

        .wc-swipe-container.active {
            display: flex !important;
            flex-direction: column !important;
        }

        .wc-swipe-viewport {
            position: relative;
            width: 100%;
            height: 100%;
            overflow: hidden;
        }

        .wc-swipe-track {
            position: absolute;
            width: 100%;
            height: 100%;
            transition: transform ${CONFIG.animationDuration}ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }

        .wc-moment-card {
            position: absolute;
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            background: #fff;
            overflow-y: auto;
            overflow-x: hidden;
        }

        .wc-moment-card.skipped {
            display: none !important;
        }

        .wc-card-header {
            padding: 16px 20px;
            display: flex;
            align-items: center;
            gap: 12px;
            border-bottom: 1px solid #eee;
            background: #fff;
            position: sticky;
            top: 0;
            z-index: 10;
        }

        .wc-avatar {
            width: 44px;
            height: 44px;
            border-radius: 4px;
            object-fit: cover;
        }

        .wc-user-info {
            flex: 1;
        }

        .wc-nickname {
            font-size: 16px;
            font-weight: 500;
            color: #576b95;
            margin-bottom: 2px;
        }

        .wc-time {
            font-size: 12px;
            color: #999;
        }

        .wc-card-content {
            flex: 1;
            padding: 16px 20px;
            overflow-y: auto;
        }

        .wc-text {
            font-size: 15px;
            line-height: 1.6;
            color: #333;
            margin-bottom: 12px;
            white-space: pre-wrap;
            word-break: break-word;
        }

        .wc-images {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 4px;
            margin-top: 8px;
        }

        .wc-images.single {
            grid-template-columns: 1fr;
            max-width: 60%;
        }

        .wc-images.double {
            grid-template-columns: repeat(2, 1fr);
        }

        .wc-img {
            width: 100%;
            aspect-ratio: 1;
            object-fit: cover;
            cursor: pointer;
            background: #f5f5f5;
        }

        .wc-images.single .wc-img {
            aspect-ratio: auto;
            max-height: 300px;
        }

        .wc-card-footer {
            padding: 12px 20px;
            border-top: 1px solid #eee;
            background: #fafafa;
        }

        .wc-actions {
            display: flex;
            justify-content: space-around;
            align-items: center;
        }

        .wc-action-btn {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 8px 16px;
            border-radius: 20px;
            cursor: pointer;
            transition: all 0.2s;
            background: transparent;
            border: none;
            font-size: 14px;
            color: #666;
        }

        .wc-action-btn:hover {
            background: #f0f0f0;
        }

        .wc-action-btn.skip {
            color: #ff6b6b;
        }

        .wc-action-btn.skip:hover {
            background: #ffe0e0;
        }

        .wc-action-btn.like {
            color: #ff9500;
        }

        .wc-action-btn.like:hover {
            background: #fff0e0;
        }

        .wc-action-btn.liked {
            color: #ff6b6b;
        }

        .wc-icon {
            width: 20px;
            height: 20px;
        }

        /* Controls Overlay */
        .wc-controls {
            position: fixed;
            right: 16px;
            top: 50%;
            transform: translateY(-50%);
            display: flex;
            flex-direction: column;
            gap: 12px;
            z-index: 1000000;
        }

        .wc-ctrl-btn {
            width: 44px;
            height: 44px;
            border-radius: 50%;
            background: rgba(0,0,0,0.6);
            backdrop-filter: blur(10px);
            border: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
            color: #fff;
            font-size: 18px;
        }

        .wc-ctrl-btn:hover {
            background: rgba(0,0,0,0.8);
            transform: scale(1.1);
        }

        /* Progress Indicator */
        .wc-progress {
            position: fixed;
            top: 8px;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            gap: 4px;
            z-index: 1000000;
            padding: 4px 8px;
            background: rgba(0,0,0,0.4);
            border-radius: 12px;
            backdrop-filter: blur(10px);
        }

        .wc-progress-dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: rgba(255,255,255,0.4);
            transition: all 0.2s;
        }

        .wc-progress-dot.active {
            background: #fff;
            transform: scale(1.3);
        }

        .wc-progress-dot.skipped {
            background: #ff6b6b;
        }

        /* Toggle Button */
        .wc-toggle-btn {
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 56px;
            height: 56px;
            border-radius: 50%;
            background: #07c160;
            color: #fff;
            border: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 12px rgba(7,193,96,0.4);
            z-index: 999998;
            transition: all 0.3s;
            font-size: 24px;
        }

        .wc-toggle-btn:hover {
            transform: scale(1.05);
            box-shadow: 0 6px 16px rgba(7,193,96,0.5);
        }

        .wc-toggle-btn.active {
            background: #ff6b6b;
            box-shadow: 0 4px 12px rgba(255,107,107,0.4);
        }

        /* Loading State */
        .wc-loading {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            text-align: center;
            color: #999;
        }

        .wc-loading-spinner {
            width: 40px;
            height: 40px;
            border: 3px solid #eee;
            border-top-color: #07c160;
            border-radius: 50%;
            animation: wc-spin 1s linear infinite;
            margin: 0 auto 12px;
        }

        @keyframes wc-spin {
            to { transform: rotate(360deg); }
        }

        /* Video Container */
        .wc-video-container {
            position: relative;
            width: 100%;
            background: #000;
        }

        .wc-video-container video {
            width: 100%;
            max-height: 60vh;
            display: block;
        }

        /* Link Preview */
        .wc-link-card {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px;
            background: #f5f5f5;
            border-radius: 8px;
            margin-top: 8px;
            cursor: pointer;
            text-decoration: none;
        }

        .wc-link-thumb {
            width: 60px;
            height: 60px;
            border-radius: 4px;
            object-fit: cover;
            background: #ddd;
        }

        .wc-link-info {
            flex: 1;
            min-width: 0;
        }

        .wc-link-title {
            font-size: 14px;
            font-weight: 500;
            color: #333;
            margin-bottom: 4px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .wc-link-desc {
            font-size: 12px;
            color: #999;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        /* Empty State */
        .wc-empty {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            text-align: center;
            color: #999;
        }

        .wc-empty-icon {
            font-size: 48px;
            margin-bottom: 16px;
        }

        .wc-empty-text {
            font-size: 14px;
        }

        /* Hide original moments in swipe mode */
        body.wc-swipe-mode .web_wechat_moments {
            visibility: hidden;
        }
    `;

    // ===== Icons (SVG) =====
    const ICONS = {
        skip: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 18L18 6M6 6l12 12"/></svg>`,
        like: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
        liked: `<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
        comment: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>`,
        up: `↑`,
        down: `↓`,
        close: `✕`,
        swipe: `⬆`
    };

    // ===== DOM Observer =====
    let momentsObserver = null;

    function initObserver() {
        momentsObserver = new MutationObserver((mutations) => {
            if (!state.isActive) return;

            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) {
                        const momentItems = node.matches?.('.moment_item') ? [node] :
                                          node.querySelectorAll?.('.moment_item') || [];
                        momentItems.forEach(item => processMomentItem(item));
                    }
                });
            });
        });

        const momentsList = document.querySelector('.web_wechat_moments_list');
        if (momentsList) {
            momentsObserver.observe(momentsList, { childList: true, subtree: true });
        }
    }

    // ===== Moment Processing =====
    function processMomentItem(item) {
        const momentData = extractMomentData(item);
        if (momentData && !state.moments.find(m => m.id === momentData.id)) {
            state.moments.push(momentData);
            if (state.isActive) {
                addMomentCard(momentData);
                updateProgress();
            }
        }
    }

    function extractMomentData(item) {
        try {
            const id = item.getAttribute('data-id') ||
                      item.getAttribute('id') ||
                      'moment_' + Math.random().toString(36).substr(2, 9);

            const avatarEl = item.querySelector('.avatar img, .user_avatar img');
            const nicknameEl = item.querySelector('.nickname, .user_name');
            const timeEl = item.querySelector('.time, .timestamp');
            const contentEl = item.querySelector('.content, .moment_content');
            const textEl = contentEl?.querySelector('.text, .moment_text');

            const images = Array.from(item.querySelectorAll('.picture img, .moment_img img')).map(img => ({
                src: img.src,
                thumb: img.getAttribute('data-src') || img.src
            }));

            const videoEl = item.querySelector('video');
            const video = videoEl ? {
                src: videoEl.src,
                poster: videoEl.poster
            } : null;

            const linkEl = item.querySelector('.link, .share_link');
            const link = linkEl ? {
                url: linkEl.href,
                title: linkEl.querySelector('.title')?.textContent,
                desc: linkEl.querySelector('.desc')?.textContent,
                thumb: linkEl.querySelector('img')?.src
            } : null;

            return {
                id,
                avatar: avatarEl?.src || '',
                nickname: nicknameEl?.textContent?.trim() || 'Unknown',
                time: timeEl?.textContent?.trim() || '',
                text: textEl?.textContent?.trim() || contentEl?.textContent?.trim() || '',
                images,
                video,
                link,
                likes: [],
                comments: [],
                element: item,
                isSkipped: false,
                isLiked: false
            };
        } catch (e) {
            log('Error extracting moment:', e);
            return null;
        }
    }

    // ===== UI Creation =====
    function createContainer() {
        if (document.getElementById('wc-swipe-container')) return;

        GM_addStyle(STYLES);

        const container = document.createElement('div');
        container.id = 'wc-swipe-container';
        container.className = 'wc-swipe-container';
        container.innerHTML = `
            <div class="wc-progress" id="wc-progress"></div>
            <div class="wc-swipe-viewport" id="wc-viewport">
                <div class="wc-swipe-track" id="wc-track"></div>
            </div>
            <div class="wc-controls">
                <button class="wc-ctrl-btn" id="wc-btn-up" title="上一条">${ICONS.up}</button>
                <button class="wc-ctrl-btn" id="wc-btn-down" title="下一条">${ICONS.down}</button>
                <button class="wc-ctrl-btn" id="wc-btn-close" title="退出滑动模式">${ICONS.close}</button>
            </div>
        `;
        document.body.appendChild(container);

        const toggleBtn = document.createElement('button');
        toggleBtn.id = 'wc-toggle-btn';
        toggleBtn.className = 'wc-toggle-btn';
        toggleBtn.innerHTML = ICONS.swipe;
        toggleBtn.title = '切换滑动模式';
        document.body.appendChild(toggleBtn);

        bindEvents();
    }

    function addMomentCard(moment) {
        const track = document.getElementById('wc-track');
        if (!track || document.getElementById(`wc-card-${moment.id}`)) return;

        const card = document.createElement('div');
        card.id = `wc-card-${moment.id}`;
        card.className = 'wc-moment-card';
        card.dataset.index = state.moments.indexOf(moment);
        card.dataset.id = moment.id;

        const imagesHtml = moment.images.length > 0 ? `
            <div class="wc-images ${moment.images.length === 1 ? 'single' : moment.images.length === 2 ? 'double' : ''}">
                ${moment.images.map(img => `<img class="wc-img" src="${img.thumb}" data-src="${img.src}" loading="lazy">`).join('')}
            </div>
        ` : '';

        const videoHtml = moment.video ? `
            <div class="wc-video-container">
                <video src="${moment.video.src}" poster="${moment.video.poster || ''}" controls playsinline></video>
            </div>
        ` : '';

        const linkHtml = moment.link ? `
            <a class="wc-link-card" href="${moment.link.url}" target="_blank">
                ${moment.link.thumb ? `<img class="wc-link-thumb" src="${moment.link.thumb}">` : ''}
                <div class="wc-link-info">
                    <div class="wc-link-title">${moment.link.title || '链接'}</div>
                    ${moment.link.desc ? `<div class="wc-link-desc">${moment.link.desc}</div>` : ''}
                </div>
            </a>
        ` : '';

        card.innerHTML = `
            <div class="wc-card-header">
                <img class="wc-avatar" src="${moment.avatar}" alt="">
                <div class="wc-user-info">
                    <div class="wc-nickname">${moment.nickname}</div>
                    <div class="wc-time">${moment.time}</div>
                </div>
            </div>
            <div class="wc-card-content">
                ${moment.text ? `<div class="wc-text">${moment.text}</div>` : ''}
                ${imagesHtml}
                ${videoHtml}
                ${linkHtml}
            </div>
            <div class="wc-card-footer">
                <div class="wc-actions">
                    <button class="wc-action-btn skip" data-action="skip" data-id="${moment.id}">
                        <span class="wc-icon">${ICONS.skip}</span>
                        <span>划走</span>
                    </button>
                    <button class="wc-action-btn like ${moment.isLiked ? 'liked' : ''}" data-action="like" data-id="${moment.id}">
                        <span class="wc-icon">${moment.isLiked ? ICONS.liked : ICONS.like}</span>
                        <span>${moment.isLiked ? '已赞' : '点赞'}</span>
                    </button>
                    <button class="wc-action-btn" data-action="comment" data-id="${moment.id}">
                        <span class="wc-icon">${ICONS.comment}</span>
                        <span>评论</span>
                    </button>
                </div>
            </div>
        `;

        track.appendChild(card);
        updateCardPositions();
    }

    function updateCardPositions() {
        const cards = document.querySelectorAll('.wc-moment-card');
        const viewportHeight = window.innerHeight;

        cards.forEach((card, index) => {
            const offset = (index - state.currentIndex) * viewportHeight;
            card.style.transform = `translateY(${offset}px)`;
        });
    }

    function updateProgress() {
        const progress = document.getElementById('wc-progress');
        if (!progress) return;

        const total = state.moments.length;
        const visibleCount = total - state.skippedIds.size;

        progress.innerHTML = state.moments.map((m, i) => {
            const isSkipped = state.skippedIds.has(m.id);
            const isActive = i === state.currentIndex;
            return `<div class="wc-progress-dot ${isActive ? 'active' : ''} ${isSkipped ? 'skipped' : ''}"></div>`;
        }).join('');

        progress.title = `${state.currentIndex + 1} / ${total} (已跳过 ${state.skippedIds.size})`;
    }

    // ===== Swipe Logic =====
    function goToSlide(index) {
        if (state.isAnimating) return;

        const total = state.moments.length;
        if (index < 0 || index >= total) return;

        // Skip skipped items
        while (index < total && state.skippedIds.has(state.moments[index]?.id)) {
            index++;
        }
        if (index >= total) return;

        state.isAnimating = true;
        state.currentIndex = index;
        updateCardPositions();
        updateProgress();

        setTimeout(() => {
            state.isAnimating = false;
        }, CONFIG.animationDuration);
    }

    function goNext() {
        goToSlide(state.currentIndex + 1);
    }

    function goPrev() {
        goToSlide(state.currentIndex - 1);
    }

    function skipCurrent() {
        const currentMoment = state.moments[state.currentIndex];
        if (!currentMoment) return;

        state.skippedIds.add(currentMoment.id);
        currentMoment.isSkipped = true;

        const card = document.getElementById(`wc-card-${currentMoment.id}`);
        if (card) card.classList.add('skipped');

        log('Skipped moment:', currentMoment.id);
        updateProgress();
        goNext();
    }

    function toggleLike(id) {
        const moment = state.moments.find(m => m.id === id);
        if (!moment) return;

        moment.isLiked = !moment.isLiked;

        // Update UI
        const btn = document.querySelector(`.wc-action-btn[data-action="like"][data-id="${id}"]`);
        if (btn) {
            btn.classList.toggle('liked', moment.isLiked);
            btn.querySelector('.wc-icon').innerHTML = moment.isLiked ? ICONS.liked : ICONS.like;
            btn.querySelector('span:last-child').textContent = moment.isLiked ? '已赞' : '点赞';
        }

        // Trigger original like button
        const originalBtn = moment.element?.querySelector('.like_btn, .moment_like');
        if (originalBtn && !moment.isLiked === originalBtn.classList.contains('liked')) {
            originalBtn.click();
        }
    }

    // ===== Event Handlers =====
    function bindEvents() {
        const container = document.getElementById('wc-swipe-container');
        const toggleBtn = document.getElementById('wc-toggle-btn');
        const viewport = document.getElementById('wc-viewport');

        // Toggle button
        toggleBtn?.addEventListener('click', toggleSwipeMode);

        // Control buttons
        document.getElementById('wc-btn-up')?.addEventListener('click', goPrev);
        document.getElementById('wc-btn-down')?.addEventListener('click', goNext);
        document.getElementById('wc-btn-close')?.addEventListener('click', deactivateSwipeMode);

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (!state.isActive) return;

            switch(e.key) {
                case 'ArrowUp': goPrev(); break;
                case 'ArrowDown': goNext(); break;
                case 'ArrowLeft': goPrev(); break;
                case 'ArrowRight': goNext(); break;
                case 'Escape': deactivateSwipeMode(); break;
                case 's': case 'S': skipCurrent(); break;
            }
        });

        // Mouse wheel
        let wheelTimeout = null;
        viewport?.addEventListener('wheel', (e) => {
            if (!state.isActive) return;
            e.preventDefault();

            clearTimeout(wheelTimeout);
            wheelTimeout = setTimeout(() => {
                if (e.deltaY > 0) goNext();
                else if (e.deltaY < 0) goPrev();
            }, 50);
        }, { passive: false });

        // Touch gestures
        let touchStartY = 0;
        viewport?.addEventListener('touchstart', (e) => {
            touchStartY = e.touches[0].clientY;
        }, { passive: true });

        viewport?.addEventListener('touchend', (e) => {
            if (!state.isActive) return;

            const touchEndY = e.changedTouches[0].clientY;
            const deltaY = touchStartY - touchEndY;

            if (Math.abs(deltaY) > CONFIG.swipeThreshold) {
                if (deltaY > 0) goNext();
                else goPrev();
            }
        }, { passive: true });

        // Card action buttons
        container?.addEventListener('click', (e) => {
            const btn = e.target.closest('.wc-action-btn');
            if (!btn) return;

            const action = btn.dataset.action;
            const id = btn.dataset.id;

            switch(action) {
                case 'skip': skipCurrent(); break;
                case 'like': toggleLike(id); break;
                case 'comment':
                    // Focus on original comment input
                    const moment = state.moments.find(m => m.id === id);
                    const commentBtn = moment?.element?.querySelector('.comment_btn, .moment_comment');
                    commentBtn?.click();
                    break;
            }
        });

        // Image click to view
        container?.addEventListener('click', (e) => {
            if (e.target.classList.contains('wc-img')) {
                const src = e.target.dataset.src || e.target.src;
                // Trigger original image viewer
                e.target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            }
        });
    }

    // ===== Mode Switching =====
    function toggleSwipeMode() {
        if (state.isActive) {
            deactivateSwipeMode();
        } else {
            activateSwipeMode();
        }
    }

    function activateSwipeMode() {
        log('Activating swipe mode');

        // Scan existing moments
        const existingItems = document.querySelectorAll('.moment_item');
        existingItems.forEach(item => processMomentItem(item));

        if (state.moments.length === 0) {
            alert('暂无朋友圈内容，请先进入朋友圈页面');
            return;
        }

        state.isActive = true;
        document.body.classList.add('wc-swipe-mode');
        document.getElementById('wc-swipe-container')?.classList.add('active');
        document.getElementById('wc-toggle-btn')?.classList.add('active');

        // Reset to first non-skipped
        state.currentIndex = -1;
        goToSlide(0);
        updateProgress();

        initObserver();
    }

    function deactivateSwipeMode() {
        log('Deactivating swipe mode');
        state.isActive = false;
        document.body.classList.remove('wc-swipe-mode');
        document.getElementById('wc-swipe-container')?.classList.remove('active');
        document.getElementById('wc-toggle-btn')?.classList.remove('active');

        momentsObserver?.disconnect();
    }

    // ===== Initialization =====
    function init() {
        log('Initializing WeChat Moments Swipe');

        // Wait for WeChat to load
        const checkInterval = setInterval(() => {
            const momentsList = document.querySelector('.web_wechat_moments_list') ||
                               document.querySelector('[class*="moment"]');

            if (momentsList && document.body) {
                clearInterval(checkInterval);
                createContainer();
                log('Ready');
            }
        }, 1000);

        // Timeout after 30 seconds
        setTimeout(() => clearInterval(checkInterval), 30000);
    }

    // Start
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
