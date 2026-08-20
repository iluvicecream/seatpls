<script lang="ts">
    import PocketBase from 'pocketbase'
    import { page } from '$app/stores'

    const pb = new PocketBase('https://base.seatpls.perr.dev')

    var stage = $page.url.searchParams.get('stage') || 'join'

</script>

<h1>Join Room</h1>
<p>@{stage}</p>