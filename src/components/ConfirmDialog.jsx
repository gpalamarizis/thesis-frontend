import Modal from './Modal';

function ConfirmDialog({ title = 'Επιβεβαίωση', message, confirmLabel = 'Ναι', cancelLabel = 'Ακύρωση', danger = true, onConfirm, onClose }) {
  return (
    <Modal
      title={title}
      onClose={onClose}
      actions={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>{cancelLabel}</button>
          <button type="button" className={`btn ${danger ? 'btn-danger' : ''}`} onClick={() => { onConfirm(); onClose(); }}>{confirmLabel}</button>
        </>
      }
    >
      <p style={{ color: '#4a5568', lineHeight: 1.6 }}>{message}</p>
    </Modal>
  );
}

export default ConfirmDialog;
