import Button from './ui/Button';
import Modal from './ui/Modal';

interface WordConfirmModalProps {
  word: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function WordConfirmModal({ word, onConfirm, onCancel }: WordConfirmModalProps) {
  return (
    <Modal className="text-center">
      <p className="[font-family:'Gowun_Dodum'] text-[16px] mb-5">
        입력한 단어 : <strong>{word}</strong>
        <br />
        이 단어로 누군가와 연결을 시도할까요?
      </p>
      <div className="flex justify-center gap-2.5">
        <Button variant="inline" onClick={onCancel}>아니오</Button>
        <Button variant="inline" onClick={onConfirm}>예</Button>
      </div>
    </Modal>
  );
}
