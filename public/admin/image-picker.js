// Admin image picker: Upload (file) or Create (AI) via radio. Preview + remove. Styles injected once.
window.ImagePicker = {
  _uid: 0,
  _styled: false,

  mount(container, opts = {}) {
    if (!this._styled) {
      this._styled = true;
      const s = document.createElement('style');
      s.textContent = `
        .ip__preview { margin-bottom: 0.6rem; }
        .ip__img { max-width: 240px; border-radius: 8px; display: block; margin-bottom: 0.4rem; }
        .ip__remove { background: none; border: none; color: #8B3A62; cursor: pointer; font-size: 0.85rem; padding: 0; }
        .ip__mode { display: flex; gap: 0.5rem; margin-bottom: 0.75rem; }
        .ip__mode-option { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.45rem 1rem; border: 1px solid #ddd; border-radius: 999px; font-size: 0.85rem; cursor: pointer; color: #333; background: #fff; }
        .ip__mode-option:has(input:checked) { border-color: #8B3A62; background: #f6ecf2; color: #8B3A62; font-weight: 600; }
        .ip__mode-option input { accent-color: #8B3A62; }
        .ip__prompt { flex: 1; min-width: 180px; padding: 0.5rem 0.65rem; border: 1px solid #ddd; border-radius: 6px; font-size: 0.9rem; }
        .ip__row { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
        .ip__status { font-size: 0.85rem; margin-top: 0.5rem; }
        .ip__upload, .ip__gen { display: inline-flex; align-items: center; padding: 0.5rem 1rem; border: 1px solid #8B3A62; background: #8B3A62; color: #fff; border-radius: 6px; font-size: 0.85rem; font-weight: 500; cursor: pointer; }
        .ip__upload:hover, .ip__gen:hover { background: #6d2e4d; }
        .ip__gen:disabled { opacity: 0.6; cursor: not-allowed; }
      `;
      document.head.appendChild(s);
    }

    const onChange = opts.onChange || (() => {});
    const modeName = 'ip-mode-' + (++this._uid);

    container.innerHTML = `
      <div class="ip">
        <div class="ip__preview" ${opts.initialUrl ? '' : 'hidden'}>
          <img class="ip__img" src="${opts.initialUrl || ''}" alt="Selected image" />
          <button type="button" class="ip__remove">Remove</button>
        </div>
        <div class="ip__mode" role="radiogroup" aria-label="Image source">
          <label class="ip__mode-option">
            <input type="radio" name="${modeName}" value="upload" checked />
            Upload
          </label>
          <label class="ip__mode-option">
            <input type="radio" name="${modeName}" value="create" />
            Create
          </label>
        </div>
        <div class="ip__panel--upload">
          <label class="ip__upload">Choose an image file…
            <input type="file" accept="image/*" class="ip__file" style="position:absolute;width:1px;height:1px;opacity:0;overflow:hidden;clip:rect(0 0 0 0);" />
          </label>
        </div>
        <div class="ip__panel--create" hidden>
          <div class="ip__row">
            <input type="text" class="ip__prompt" placeholder="Describe the image to create…" />
            <button type="button" class="ip__gen">✨ Create</button>
          </div>
        </div>
        <p class="ip__status" hidden></p>
      </div>`;

    const fileInput = container.querySelector('.ip__file');
    const promptInput = container.querySelector('.ip__prompt');
    const genBtn = container.querySelector('.ip__gen');
    const status = container.querySelector('.ip__status');
    const preview = container.querySelector('.ip__preview');
    const img = container.querySelector('.ip__img');
    const removeBtn = container.querySelector('.ip__remove');
    const uploadPanel = container.querySelector('.ip__panel--upload');
    const createPanel = container.querySelector('.ip__panel--create');

    function setStatus(msg, isError) {
      status.hidden = !msg;
      status.textContent = msg || '';
      status.style.color = isError ? '#721c24' : '#555';
    }
    function setUrl(url) {
      img.src = url;
      preview.hidden = false;
      onChange(url);
      setStatus('');
    }

    container.querySelectorAll('input[name="' + modeName + '"]').forEach(r => {
      r.addEventListener('change', () => {
        const mode = container.querySelector('input[name="' + modeName + '"]:checked').value;
        uploadPanel.hidden = mode !== 'upload';
        createPanel.hidden = mode !== 'create';
      });
    });

    fileInput.addEventListener('change', async () => {
      const file = fileInput.files[0];
      if (!file) return;
      setStatus('Uploading…');
      const fd = new FormData();
      fd.append('file', file);
      try {
        const r = await fetch('/api/upload-image', { method: 'POST', body: fd, credentials: 'same-origin' });
        const d = await r.json();
        if (d.success) { setUrl(d.url); fileInput.value = ''; }
        else setStatus(d.error || 'Upload failed', true);
      } catch {
        setStatus('Upload failed. Please try again.', true);
      }
    });

    genBtn.addEventListener('click', async () => {
      const prompt = promptInput.value.trim();
      if (prompt.length < 3) return setStatus('Type a short description first.', true);
      genBtn.disabled = true;
      setStatus('Creating your image… this takes a few seconds.');
      try {
        const r = await fetch('/api/generate-image', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt }), credentials: 'same-origin' });
        const d = await r.json();
        if (d.success) setUrl(d.url);
        else setStatus(d.error || 'Could not create image. Upload one instead.', true);
      } catch {
        setStatus('Could not create image. Upload one instead.', true);
      }
      genBtn.disabled = false;
    });

    removeBtn.addEventListener('click', () => {
      preview.hidden = true;
      img.src = '';
      onChange('');
      fileInput.value = '';
      promptInput.value = '';
    });
  },
};
