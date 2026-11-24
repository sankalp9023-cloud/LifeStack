export default function confirmAction(message, { title = 'Please confirm', confirmLabel = 'Continue' } = {}) {
  return new Promise((resolve) => {
    const dialog = document.createElement('dialog');
    dialog.className = 'system-confirm-dialog';
    const heading = document.createElement('h2');
    heading.textContent = title;
    const description = document.createElement('p');
    description.textContent = message;
    const actions = document.createElement('div');
    actions.className = 'system-confirm-actions';
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'system-confirm-cancel';
    cancel.textContent = 'Cancel';
    const confirm = document.createElement('button');
    confirm.type = 'button';
    confirm.className = 'system-confirm-submit';
    confirm.textContent = confirmLabel;
    actions.append(cancel, confirm);
    dialog.append(heading, description, actions);
    document.body.append(dialog);
    let settled = false;
    const finish = (accepted) => {
      if (settled) return;
      settled = true;
      dialog.close();
      dialog.remove();
      resolve(accepted);
    };
    cancel.addEventListener('click', () => finish(false));
    confirm.addEventListener('click', () => finish(true));
    dialog.addEventListener('cancel', (event) => { event.preventDefault(); finish(false); });
    dialog.showModal();
    cancel.focus();
  });
}
