<?php

namespace App\Http\Controllers;

use App\Models\Tag;
use Illuminate\Http\Request;

class TagController extends Controller
{
    public function index()
    {
        $tags = auth()->user()->tags()->get();
        return response()->json($tags);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'color' => 'nullable|string',
        ]);

        $tag = auth()->user()->tags()->create($request->all());
        return response()->json($tag, 201);
    }

    public function show(Tag $tag)
    {
        return response()->json($tag);
    }

    public function update(Request $request, Tag $tag)
    {
        $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'color' => 'nullable|string',
        ]);

        $tag->update($request->all());
        return response()->json($tag);
    }

    public function destroy(Tag $tag)
    {
        $tag->delete();
        return response()->json(['message' => 'Tag deleted successfully']);
    }
}