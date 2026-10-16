import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { DEFAULT_FUNDS, DEFAULT_CATEGORIES, DEFAULT_SETTINGS } from '@/lib/initial-data';
import { Fund, Transaction, Category, AppSettings } from '@/types/finance';

interface StorageData {
  funds: Fund[];
  transactions: Transaction[];
  categories: Category[];
  settings: AppSettings;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'rizqwise-db.json');
const LEGACY_FILE = path.join(DATA_DIR, 'rizqflow-db.json');

function ensureDataFile(): StorageData {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  // If new file doesn't exist but legacy file exists, migrate it seamlessly
  if (!fs.existsSync(DATA_FILE) && fs.existsSync(LEGACY_FILE)) {
    try {
      const legacyContent = fs.readFileSync(LEGACY_FILE, 'utf8');
      fs.writeFileSync(DATA_FILE, legacyContent, 'utf8');
    } catch (e) {
      console.warn('Migration from legacy database file failed:', e);
    }
  }

  if (!fs.existsSync(DATA_FILE)) {
    const initialData: StorageData = {
      funds: DEFAULT_FUNDS,
      transactions: [],
      categories: DEFAULT_CATEGORIES,
      settings: DEFAULT_SETTINGS,
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2), 'utf8');
    return initialData;
  }

  try {
    const content = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(content);
  } catch (err) {
    console.error('Failed to parse database file, falling back to defaults:', err);
    return {
      funds: DEFAULT_FUNDS,
      transactions: [],
      categories: DEFAULT_CATEGORIES,
      settings: DEFAULT_SETTINGS,
    };
  }
}

export async function GET() {
  try {
    const data = ensureDataFile();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const currentData = ensureDataFile();

    const updatedData: StorageData = {
      funds: body.funds ?? currentData.funds,
      transactions: body.transactions ?? currentData.transactions,
      categories: body.categories ?? currentData.categories,
      settings: body.settings ?? currentData.settings,
    };

    const serialized = JSON.stringify(updatedData, null, 2);
    fs.writeFileSync(DATA_FILE, serialized, 'utf8');
    try {
      fs.writeFileSync(LEGACY_FILE, serialized, 'utf8');
    } catch (_) {}

    return NextResponse.json({ success: true, data: updatedData });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
