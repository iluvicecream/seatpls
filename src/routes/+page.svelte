

<script lang="ts">
    import { SquarePen, LogIn } from '@lucide/svelte';
</script>

<div class="flex flex-col min-h-screen p-10">
    <div class="flex flex-col items-center text-center gap-4 mt-20 mx-auto w-full max-w-md">
        <h1 class="text-6xl font-bold text-white md:text-7xl">SeatPls</h1>
        <p class="text-xl text-gray-100 md:text-2xl">จองที่นั่งของคุณได้อย่างง่ายดาย</p>
    </div>

    <div class="flex-1"></div>

    <div class="flex flex-col gap-10 w-full max-w-md mx-auto">
    <button onclick={() => window.location.href = '/create'} class="bg-white text-black border-gray-100 border-2 p-10 rounded-4xl drop-shadow-xl flex items-center justify-between gap-4 sm:p-12 sm:text-xl">
        <span class="bg-gray-100 p-3 flex items-center justify-center rounded-xl">
            <SquarePen />
        </span>
        <span>สร้างห้อง</span>
    </button>

    <button onclick={() => window.location.href = '/join'} class="bg-white text-black border-gray-100 border-2 p-10 rounded-4xl drop-shadow-xl flex items-center justify-between gap-4 sm:p-12 sm:text-xl">
        <span class="bg-gray-100 p-3 flex items-center justify-center rounded-xl">
            <LogIn />
        </span>
        <span>เข้าร่วมห้อง</span>
    </button>
</div>
</div>