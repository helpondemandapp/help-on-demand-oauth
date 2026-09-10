import React from 'react';
import { FloatingLabel, Form } from 'react-bootstrap';

type FloatingTextInputProps = Omit<React.HTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'id'> & {
  value: string;
  onChange: (value: string) => void;
  id: string;
  label: React.ReactNode;
  type?: string;
  placeholder?: string;
  isValid?: boolean;
  isInvalid?: boolean;
};

const FloatingTextInput = ({ value, onChange, id, label, ...props }: FloatingTextInputProps) => {
  return (
    <FloatingLabel label={label} controlId={id}>
      <Form.Control value={value} onChange={(event) => onChange(event.target.value)} {...props} />
    </FloatingLabel>
  );
};

export default FloatingTextInput;
