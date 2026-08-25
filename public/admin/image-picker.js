// Reusable admin image picker: upload OR generate-from-description, with preview.
// Usage: ImagePicker.mount(containerEl, { onChange: (url) => {...}, initialUrl });
// Manual upload is always available; AI generation is an additive convenience.
window.ImagePicker = {
  mount(container, opts = {}) {
    const onChange = opts.onChange || (() => {});
    container.innerHTML = `
      <div class="ip">
        <div class="ip__preview" ${opts.initialUrl ? '' : 'hidden'}>
          <img class="ip__img" src="${opts.initialUrl || ''}" alt="Selected image" />
          <button type="button" class="ip__remove">Remove</button>
        </div>
        <div class="ip__row">
          <label class="ip__upload btn-small">Upload image
            <input type="file" accept="image/*" class="ip__file" style="position:absolute;width:1px;height:1px;opacity:0;overflow:hidden;clip:rect(0 0 0 0);" />
          </label>
          <span class="ip__or">or</span>
          <input type="text" class="ip__prompt" placeholder="Describe an image to create…" />
          <button type="button" class="ip__gen btn-small">✨ Create</button>
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

    fileInput.addEventListener('change', async () => {
      const file = fileInput.files[0];
      if (!file) return;
      setStatus('Uploading…');
      const fd = new FormData();
      fd.append('file', file);
      try {
        const r = await fetch('/api/upload-image', { method: 'POST', body: fd, credentials: 'same-origin' });
        const d = await r.json();
        if (d.success) setUrl(d.url);
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
        const r = await fetch('/api/generate-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt }),
          credentials: 'same-origin',
        });
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
