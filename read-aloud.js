(() => {
  const synth = window.speechSynthesis;
  const Utterance = window.SpeechSynthesisUtterance;
  const supported = Boolean(synth && Utterance);
  const languages = {
    de: ['de-DE', 'Vorlesen', 'Pause', 'Fortsetzen', 'Stopp', 'Vorlesen in diesem Browser nicht verfügbar.', 'Für diese Sprache ist auf diesem Gerät keine Stimme vorhanden.'],
    uk: ['uk-UA', 'Слухати', 'Пауза', 'Продовжити', 'Зупинити', 'Цей браузер не підтримує озвучення.', 'На цьому пристрої немає голосу для цієї мови.'],
    tr: ['tr-TR', 'Sesli oku', 'Duraklat', 'Devam et', 'Durdur', 'Bu tarayıcı sesli okumayı desteklemiyor.', 'Bu cihazda bu dil için ses yok.'],
    ar: ['ar-SA', 'استمع', 'إيقاف مؤقت', 'متابعة', 'إيقاف', 'القراءة الصوتية غير متاحة في هذا المتصفح.', 'لا يتوفر صوت لهذه اللغة على هذا الجهاز.'],
    en: ['en-US', 'Read aloud', 'Pause', 'Resume', 'Stop', 'Read aloud is unavailable in this browser.', 'No voice for this language is installed on this device.'],
    es: ['es-ES', 'Escuchar', 'Pausar', 'Continuar', 'Detener', 'La lectura en voz alta no está disponible en este navegador.', 'Este dispositivo no tiene voz para este idioma.'],
    fr: ['fr-FR', 'Écouter', 'Pause', 'Reprendre', 'Arrêter', 'La lecture à voix haute est indisponible dans ce navigateur.', 'Aucune voix pour cette langue n’est installée sur cet appareil.'],
    pl: ['pl-PL', 'Odsłuchaj', 'Pauza', 'Wznów', 'Zatrzymaj', 'Czytanie na głos jest niedostępne w tej przeglądarce.', 'Na tym urządzeniu nie ma głosu dla tego języka.'],
    ru: ['ru-RU', 'Слушать', 'Пауза', 'Продолжить', 'Остановить', 'Озвучивание недоступно в этом браузере.', 'На этом устройстве нет голоса для этого языка.'],
    da: ['da-DK', 'Læs højt', 'Pause', 'Fortsæt', 'Stop', 'Højtlæsning er ikke tilgængelig i denne browser.', 'Der er ingen stemme til dette sprog på denne enhed.'],
    he: ['he-IL', 'הקראה', 'השהיה', 'המשך', 'עצירה', 'הקראה אינה זמינה בדפדפן הזה.', 'אין במכשיר קול לשפה הזאת.'],
    yi: ['yi', 'פֿאָרלייענען', 'פּויזע', 'ווײַטער', 'אָפּשטעלן', 'פֿאָרלייענען איז נישט פֿאַראַן אין דעם בראַוזער.', 'אויף דעם מכשיר איז נישטאָ קיין קול פֿאַר דער שפּראַך.']
  };

  let active = null;
  let generation = 0;

  function baseLanguage(tag) {
    const base = tag.toLowerCase().split('-')[0];
    return ({ iw: 'he', ji: 'yi' })[base] || base;
  }

  function voiceFor(tag) {
    const voices = synth.getVoices();
    const base = baseLanguage(tag);
    return voices.find(voice => voice.lang.toLowerCase() === tag.toLowerCase()) ||
      voices.find(voice => baseLanguage(voice.lang) === base) || null;
  }

  function chunks(text) {
    const result = [];
    while (text.length > 320) {
      let cut = text.lastIndexOf(' ', 320);
      if (cut < 160) cut = 320;
      result.push(text.slice(0, cut).trim());
      text = text.slice(cut).trim();
    }
    if (text) result.push(text);
    return result;
  }

  function passageSegments(article, pageLanguage) {
    const result = [];
    article.querySelectorAll('h3, h4, p, li, blockquote').forEach(block => {
      if (block.matches('blockquote') && block.querySelector('p')) return;
      if (block.closest('.listen-controls, .poster-duo, .eu-links') ||
          block.matches('.source-line, .source-link, .signature')) return;
      const copy = block.cloneNode(true);
      copy.querySelectorAll('a[href^="#quelle-"], a[href^="#trotzki-"]').forEach(link => link.remove());
      const text = copy.textContent.replace(/\s+/g, ' ').trim();
      const language = block.closest('[lang]')?.lang || pageLanguage;
      for (const part of chunks(text)) result.push({ text: part, language });
    });
    return result;
  }

  function updateButtons(controls, state) {
    controls.querySelector('.listen-pause').disabled = state === 'stopped';
    controls.querySelector('.listen-stop').disabled = state === 'stopped';
    const play = controls.querySelector('.listen-play');
    play.setAttribute('aria-pressed', state === 'playing' ? 'true' : 'false');
  }

  function stop() {
    generation++;
    if (supported) synth.cancel();
    if (active) {
      updateButtons(active.controls, 'stopped');
      const pause = active.controls.querySelector('.listen-pause');
      const pauseLabel = languages[active.language][2];
      pause.setAttribute('aria-label', pauseLabel);
      pause.title = pauseLabel;
      pause.textContent = '⏸';
      active.controls.querySelector('.listen-status').textContent = '';
    }
    active = null;
  }

  function speakNext(token) {
    if (!active || token !== generation) return;
    if (active.index === active.segments.length) {
      stop();
      return;
    }
    const { text, language } = active.segments[active.index++];
    const utterance = new Utterance(text);
    utterance.lang = languages[language]?.[0] || language;
    utterance.rate = 0.92;
    const voice = voiceFor(utterance.lang);
    if (voice) utterance.voice = voice;
    utterance.onend = () => speakNext(token);
    utterance.onerror = event => {
      if (token !== generation || event.error === 'interrupted' || event.error === 'canceled') return;
      const status = active.controls.querySelector('.listen-status');
      status.textContent = languages[active.language][6];
      stop();
      status.textContent = languages[active.language][6];
    };
    synth.speak(utterance);
  }

  function button(icon, className, label) {
    const control = document.createElement('button');
    control.type = 'button';
    control.className = className;
    control.title = label;
    control.setAttribute('aria-label', label);
    control.textContent = icon;
    return control;
  }

  const entries = [document.getElementById('deutsch'), ...document.querySelectorAll('details.translation')];
  entries.forEach(section => {
    const article = section.matches('article') ? section : section.querySelector('article.issue-body');
    if (!article) return;
    const language = section.lang;
    const labels = languages[language];
    if (!labels) return;

    const controls = document.createElement('div');
    controls.className = 'listen-controls';
    controls.lang = language;
    controls.setAttribute('role', 'group');
    controls.setAttribute('aria-label', labels[1]);
    const play = button('🔊', 'listen-play', labels[1]);
    const pause = button('⏸', 'listen-pause', labels[2]);
    const halt = button('⏹', 'listen-stop', labels[4]);
    const status = document.createElement('span');
    status.className = 'listen-status';
    status.setAttribute('role', 'status');
    controls.append(play, pause, halt, status);
    article.prepend(controls);
    updateButtons(controls, 'stopped');

    if (!supported) {
      play.disabled = true;
      status.textContent = labels[5];
      return;
    }
    play.addEventListener('click', () => {
      if (active?.controls === controls && synth.paused) {
        synth.resume();
        pause.setAttribute('aria-label', labels[2]);
        pause.title = labels[2];
        pause.textContent = '⏸';
        updateButtons(controls, 'playing');
        return;
      }
      stop();
      const segments = passageSegments(article, language);
      if (!segments.length) return;
      active = { controls, segments, index: 0, language };
      updateButtons(controls, 'playing');
      if (synth.getVoices().length && !voiceFor(labels[0])) status.textContent = labels[6];
      speakNext(generation);
    });
    pause.addEventListener('click', () => {
      if (active?.controls !== controls) return;
      if (synth.paused) {
        synth.resume();
        pause.setAttribute('aria-label', labels[2]);
        pause.title = labels[2];
        pause.textContent = '⏸';
        updateButtons(controls, 'playing');
      } else {
        synth.pause();
        pause.setAttribute('aria-label', labels[3]);
        pause.title = labels[3];
        pause.textContent = '▶';
        updateButtons(controls, 'paused');
      }
    });
    halt.addEventListener('click', stop);
  });

  window.addEventListener('pagehide', stop);
})();
