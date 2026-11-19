(function () {
  'use strict';

  var baseurl = document.body.getAttribute('data-baseurl') || '';

  /* ---------- 다크 모드 ---------- */
  var themeBtn = document.querySelector('[data-theme-toggle]');
  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
    });
  }

  /* ---------- 카테고리 드롭다운 ---------- */
  var dropdown = document.querySelector('[data-dropdown]');
  if (dropdown) {
    var toggle = dropdown.querySelector('[data-dropdown-toggle]');
    var setOpen = function (open) {
      dropdown.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
    };
    toggle.addEventListener('click', function (e) {
      e.stopPropagation();
      setOpen(!dropdown.classList.contains('is-open'));
    });
    document.addEventListener('click', function (e) {
      if (!dropdown.contains(e.target)) setOpen(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') setOpen(false);
    });
  }

  /* ---------- 코드 블록 복사 버튼 ---------- */
  document.querySelectorAll('.post__content div.highlighter-rouge').forEach(function (block) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'copy-btn';
    btn.textContent = '복사';
    btn.addEventListener('click', function () {
      var code = block.querySelector('pre code') || block.querySelector('pre');
      navigator.clipboard.writeText(code.innerText).then(function () {
        btn.textContent = '복사됨!';
        setTimeout(function () { btn.textContent = '복사'; }, 1500);
      });
    });
    block.appendChild(btn);
  });

  /* ---------- 카테고리 페이지 필터 ---------- */
  var chipWrap = document.querySelector('[data-category-chips]');
  if (chipWrap) {
    var chips = chipWrap.querySelectorAll('[data-filter]');
    var items = document.querySelectorAll('[data-category-list] [data-category]');
    var title = document.querySelector('[data-category-title]');
    var empty = document.querySelector('[data-category-empty]');

    var applyFilter = function (name) {
      var shown = 0;
      items.forEach(function (li) {
        var match = !name || li.getAttribute('data-category') === name;
        li.hidden = !match;
        if (match) shown++;
      });
      chips.forEach(function (c) {
        c.classList.toggle('is-active', c.getAttribute('data-filter') === name);
      });
      title.textContent = name ? name + ' (' + shown + ')' : '전체 글 (' + shown + ')';
      empty.hidden = shown > 0;
    };

    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        var name = chip.getAttribute('data-filter');
        var url = new URL(window.location.href);
        if (name) url.searchParams.set('c', name); else url.searchParams.delete('c');
        history.replaceState(null, '', url);
        applyFilter(name);
      });
    });

    applyFilter(new URLSearchParams(window.location.search).get('c') || '');
  }

  /* ---------- 검색 ---------- */
  var search = document.querySelector('[data-search]');
  if (!search) return;

  var input = search.querySelector('[data-search-input]');
  var results = search.querySelector('[data-search-results]');
  var index = null;
  var activeIdx = -1;

  var escapeHtml = function (s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  var highlight = function (text, q) {
    var safe = escapeHtml(text);
    if (!q) return safe;
    var re = new RegExp('(' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
    return safe.replace(re, '<mark>$1</mark>');
  };

  var loadIndex = function () {
    if (index) return Promise.resolve(index);
    return fetch(baseurl + '/search.json')
      .then(function (r) { return r.json(); })
      .then(function (data) { index = data; return data; });
  };

  var openSearch = function () {
    search.hidden = false;
    document.body.style.overflow = 'hidden';
    input.focus();
    loadIndex();
  };
  var closeSearch = function () {
    search.hidden = true;
    document.body.style.overflow = '';
    input.value = '';
    results.innerHTML = '';
  };

  var render = function (q) {
    activeIdx = -1;
    q = q.trim();
    if (!q) { results.innerHTML = ''; return; }
    loadIndex().then(function (data) {
      var lower = q.toLowerCase();
      var hits = data.filter(function (p) {
        return (p.title + ' ' + p.content + ' ' + p.category + ' ' + (p.tags || []).join(' '))
          .toLowerCase().indexOf(lower) !== -1;
      }).slice(0, 20);

      if (!hits.length) {
        results.innerHTML = '<li class="r-empty">"' + escapeHtml(q) + '"에 대한 검색 결과가 없습니다.</li>';
        return;
      }
      results.innerHTML = hits.map(function (p) {
        var i = p.content.toLowerCase().indexOf(lower);
        var snippet = i === -1 ? p.content.slice(0, 80) : p.content.slice(Math.max(0, i - 20), i + 60);
        return '<li><a href="' + p.url + '">' +
          '<span class="r-title">' + highlight(p.title, q) + '</span>' +
          '<span class="r-meta">' + escapeHtml(p.category) + ' · ' + escapeHtml(p.date) + '</span>' +
          '<span class="r-snippet">' + highlight(snippet, q) + '</span>' +
          '</a></li>';
      }).join('');
    });
  };

  var moveActive = function (dir) {
    var links = results.querySelectorAll('a');
    if (!links.length) return;
    activeIdx = (activeIdx + dir + links.length) % links.length;
    links.forEach(function (a, i) { a.classList.toggle('is-active', i === activeIdx); });
    links[activeIdx].scrollIntoView({ block: 'nearest' });
  };

  document.querySelectorAll('[data-search-open]').forEach(function (b) { b.addEventListener('click', openSearch); });
  search.querySelectorAll('[data-search-close]').forEach(function (b) { b.addEventListener('click', closeSearch); });
  input.addEventListener('input', function () { render(input.value); });

  document.addEventListener('keydown', function (e) {
    var typing = /INPUT|TEXTAREA/.test(document.activeElement.tagName);
    if (search.hidden) {
      if ((e.key === '/' && !typing) || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')) {
        e.preventDefault();
        openSearch();
      }
      return;
    }
    if (e.key === 'Escape') closeSearch();
    else if (e.key === 'ArrowDown') { e.preventDefault(); moveActive(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); moveActive(-1); }
    else if (e.key === 'Enter' && activeIdx >= 0) {
      var a = results.querySelectorAll('a')[activeIdx];
      if (a) window.location.href = a.href;
    }
  });
})();
