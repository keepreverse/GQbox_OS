export interface FieldDef {
  field: string;
  label: string;
  labelRu: string;
}

export const categoryRequiredFields: Record<string, FieldDef[]> = {
  cable: [
    { field: 'color', label: 'Color', labelRu: 'Цвет' },
    { field: 'supplier', label: 'Supplier', labelRu: 'Поставщик' },
    { field: 'bodyMaterial', label: 'Body material', labelRu: 'Материал корпуса' },
    { field: 'wireMaterial', label: 'Wire material', labelRu: 'Материал кабеля' },
    { field: 'powerW', label: 'Power (W)', labelRu: 'Мощность (W)' },
    { field: 'currentA', label: 'Current (A)', labelRu: 'Сила тока (A)' },
    { field: 'voltageV', label: 'Voltage (V)', labelRu: 'Напряжение (V)' },
    { field: 'lengthM', label: 'Length (m)', labelRu: 'Длина (м)' },
    { field: 'dataTransferMbps', label: 'Data speed', labelRu: 'Скорость передачи' },
    { field: 'connectorFemale', label: 'Input connector', labelRu: 'Входной разъем' },
    { field: 'connectorMale', label: 'Output connector', labelRu: 'Выходной разъем' },
  ],
  szu: [
    { field: 'color', label: 'Color', labelRu: 'Цвет' },
    { field: 'supplier', label: 'Supplier', labelRu: 'Поставщик' },
    { field: 'bodyMaterial', label: 'Body material', labelRu: 'Материал корпуса' },
    { field: 'powerW', label: 'Power (W)', labelRu: 'Мощность (W)' },
    { field: 'currentA', label: 'Current (A)', labelRu: 'Сила тока (A)' },
    { field: 'voltageV', label: 'Voltage (V)', labelRu: 'Напряжение (V)' },
    { field: 'deviceCount', label: 'Ports', labelRu: 'Кол-во портов' },
    { field: 'connectorFemale', label: 'Output connector', labelRu: 'Выходной разъем' },
  ],
  bzu: [
    { field: 'color', label: 'Color', labelRu: 'Цвет' },
    { field: 'supplier', label: 'Supplier', labelRu: 'Поставщик' },
    { field: 'bodyMaterial', label: 'Body material', labelRu: 'Материал корпуса' },
    { field: 'powerW', label: 'Power (W)', labelRu: 'Мощность (W)' },
    { field: 'currentA', label: 'Current (A)', labelRu: 'Сила тока (A)' },
    { field: 'voltageV', label: 'Voltage (V)', labelRu: 'Напряжение (V)' },
    { field: 'deviceCount', label: 'Ports', labelRu: 'Кол-во портов' },
    { field: 'chargingProtocol', label: 'Protocol', labelRu: 'Протокол' },
  ],
  azu: [
    { field: 'color', label: 'Color', labelRu: 'Цвет' },
    { field: 'supplier', label: 'Supplier', labelRu: 'Поставщик' },
    { field: 'bodyMaterial', label: 'Body material', labelRu: 'Материал корпуса' },
    { field: 'powerW', label: 'Power (W)', labelRu: 'Мощность (W)' },
    { field: 'currentA', label: 'Current (A)', labelRu: 'Сила тока (A)' },
    { field: 'voltageV', label: 'Voltage (V)', labelRu: 'Напряжение (V)' },
    { field: 'deviceCount', label: 'Ports', labelRu: 'Кол-во портов' },
    { field: 'connectorFemale', label: 'Input connector', labelRu: 'Входной разъем' },
    { field: 'connectorMale', label: 'Output connector', labelRu: 'Выходной разъем' },
  ],
  headphones: [
    { field: 'color', label: 'Color', labelRu: 'Цвет' },
    { field: 'supplier', label: 'Supplier', labelRu: 'Поставщик' },
    { field: 'bodyMaterial', label: 'Body material', labelRu: 'Материал корпуса' },
    { field: 'wireMaterial', label: 'Wire material', labelRu: 'Материал кабеля' },
    { field: 'connectorFemale', label: 'Connector', labelRu: 'Разъем' },
    { field: 'connectionType', label: 'Connection type', labelRu: 'Тип подключения' },
  ],
  adapter: [
    { field: 'color', label: 'Color', labelRu: 'Цвет' },
    { field: 'supplier', label: 'Supplier', labelRu: 'Поставщик' },
    { field: 'bodyMaterial', label: 'Body material', labelRu: 'Материал корпуса' },
    { field: 'wireMaterial', label: 'Wire material', labelRu: 'Материал кабеля' },
    { field: 'powerW', label: 'Power (W)', labelRu: 'Мощность (W)' },
    { field: 'currentA', label: 'Current (A)', labelRu: 'Сила тока (A)' },
    { field: 'voltageV', label: 'Voltage (V)', labelRu: 'Напряжение (V)' },
    { field: 'lengthM', label: 'Length (m)', labelRu: 'Длина (м)' },
    { field: 'dataTransferMbps', label: 'Data speed', labelRu: 'Скорость передачи' },
    { field: 'deviceCount', label: 'Ports', labelRu: 'Кол-во портов' },
    { field: 'connectorFemale', label: 'Input connector', labelRu: 'Входной разъем' },
    { field: 'connectorMale', label: 'Output connector', labelRu: 'Выходной разъем' },
    { field: 'connectionType', label: 'Connection type', labelRu: 'Тип подключения' },
  ],
  pin: [
    { field: 'supplier', label: 'Supplier', labelRu: 'Поставщик' },
    { field: 'bodyMaterial', label: 'Body material', labelRu: 'Материал корпуса' },
    { field: 'powerW', label: 'Power (W)', labelRu: 'Мощность (W)' },
    { field: 'currentA', label: 'Current (A)', labelRu: 'Сила тока (A)' },
    { field: 'voltageV', label: 'Voltage (V)', labelRu: 'Напряжение (V)' },
    { field: 'connectorFemale', label: 'Connector', labelRu: 'Разъем' },
  ],
  holder: [
    { field: 'color', label: 'Color', labelRu: 'Цвет' },
    { field: 'supplier', label: 'Supplier', labelRu: 'Поставщик' },
  ],
  case: [
    { field: 'color', label: 'Color', labelRu: 'Цвет' },
    { field: 'supplier', label: 'Supplier', labelRu: 'Поставщик' },
    { field: 'bodyMaterial', label: 'Body material', labelRu: 'Материал корпуса' },
  ],
  kit: [
    { field: 'color', label: 'Color', labelRu: 'Цвет' },
    { field: 'supplier', label: 'Supplier', labelRu: 'Поставщик' },
    { field: 'bodyMaterial', label: 'Body material', labelRu: 'Материал корпуса' },
    { field: 'wireMaterial', label: 'Wire material', labelRu: 'Материал кабеля' },
    { field: 'powerW', label: 'Power (W)', labelRu: 'Мощность (W)' },
    { field: 'lengthM', label: 'Length (m)', labelRu: 'Длина (м)' },
    { field: 'connectorFemale', label: 'Input connector', labelRu: 'Входной разъем' },
    { field: 'connectorMale', label: 'Output connector', labelRu: 'Выходной разъем' },
  ],
  blogo: [
    { field: 'color', label: 'Color', labelRu: 'Цвет' },
    { field: 'supplier', label: 'Supplier', labelRu: 'Поставщик' },
    { field: 'bodyMaterial', label: 'Body material', labelRu: 'Материал корпуса' },
    { field: 'powerW', label: 'Power (W)', labelRu: 'Мощность (W)' },
    { field: 'currentA', label: 'Current (A)', labelRu: 'Сила тока (A)' },
    { field: 'voltageV', label: 'Voltage (V)', labelRu: 'Напряжение (V)' },
    { field: 'deviceCount', label: 'Ports', labelRu: 'Кол-во портов' },
  ],
};

export function getMissingFields(product: any, categoryCode: string): string[] {
  const fields = categoryRequiredFields[categoryCode];
  if (!fields) return [];

  const missing: string[] = [];
  for (const { field } of fields) {
    const val = product[field];
    if (val == null || val === '') {
      missing.push(field);
    }
  }
  return missing;
}
