import { NextRequest, NextResponse } from 'next/server';
import { getAllAccounts, addAccount, deleteAccount } from '@/lib/db';

export async function GET() {
  try {
    const accounts = await getAllAccounts();
    return NextResponse.json({ accounts });
  } catch (error) {
    console.error('Error in accounts GET route:', error);
    return NextResponse.json(
      { error: 'Failed to fetch accounts', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { account_url, account_username } = body;

    if (!account_url) {
      return NextResponse.json(
        { error: 'account_url is required' },
        { status: 400 }
      );
    }

    const id = await addAccount(account_url, account_username);

    return NextResponse.json({ id, account_url, account_username });
  } catch (error) {
    console.error('Error in accounts POST route:', error);
    return NextResponse.json(
      { error: 'Failed to add account', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      );
    }

    const success = await deleteAccount(id);

    return NextResponse.json({ success });
  } catch (error) {
    console.error('Error in accounts DELETE route:', error);
    return NextResponse.json(
      { error: 'Failed to delete account', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

