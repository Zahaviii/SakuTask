<?php

namespace App\Http\Controllers;

use App\Models\Task;
use Illuminate\Http\Request;

class TaskController extends Controller
{
    public function index()
    {
        $tasks = auth()->user()->tasks()->with(['category', 'tags'])->get();
        return response()->json($tasks);
    }

    public function store(Request $request)
    {
        $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'priority' => 'in:low,medium,high',
            'due_date' => 'nullable|date',
            'category_id' => 'nullable|exists:categories,id',
        ]);

        $task = auth()->user()->tasks()->create($request->all());

        if ($request->has('tags')) {
            $task->tags()->sync($request->tags);
        }

        return response()->json($task->load(['category', 'tags']), 201);
    }

    public function show(Task $task)
    {
        return response()->json($task->load(['category', 'tags']));
    }

    public function update(Request $request, Task $task)
    {
        $request->validate([
            'title' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'priority' => 'in:low,medium,high',
            'due_date' => 'nullable|date',
            'category_id' => 'nullable|exists:categories,id',
            'is_completed' => 'boolean',
        ]);

        $task->update($request->all());

        if ($request->has('tags')) {
            $task->tags()->sync($request->tags);
        }

        return response()->json($task->load(['category', 'tags']));
    }

    public function destroy(Task $task)
    {
        $task->delete();
        return response()->json(['message' => 'Task deleted successfully']);
    }
}