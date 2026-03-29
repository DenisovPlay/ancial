export default function LegalPage() {
  return (
    <div class="flex flex-col jusitify-center items-center gap-3 py-3">
	<div class="w-full max-w-4xl flex sm:items-center flex-col sm:flex-row">
		<span onclick="topage('/about');" class="w-fit text-3xl font-extralight hover:text-zinc-300 duration-300 active:scale-95 flex items-center gap-1.5 px-3 lg:px-0 cursor-pointer">
			<svg class="w-8 h-8 fill-white inline" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
				<path d="M 29.449219 4.9863281 A 1.50015 1.50015 0 0 0 28.423828 5.4550781 L 11.423828 22.955078 A 1.50015 1.50015 0 0 0 11.423828 25.044922 L 28.423828 42.544922 A 1.50015 1.50015 0 1 0 30.576172 40.455078 L 14.591797 24 L 30.576172 7.5449219 A 1.50015 1.50015 0 0 0 29.449219 4.9863281 z"></path>
			</svg>
			<?php echo $lang['documents']; ?> 
		</span>
		<div class="flex-grow"></div>
		<div class="shrink-0 w-fit rounded-3xl bg-zinc-900/95 border border-zinc-600/30 duration-300 flex divide-zinc-800 divide-x mx-3 mt-3 sm:mt-0 sm:mx-0">
			<button id="allbutton" onclick="showALL()" class="p-2 lg:text-lg text-zinc-300 rounded-3xl duration-300 bg-zinc-800 rounded-r-none flex items-center justify-center active:scale-95 cursor-pointer">
				<svg class="w-6 h-6 fill-white inline" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
					<path d="M 24 4 C 12.972066 4 4 12.972074 4 24 C 4 35.027926 12.972066 44 24 44 C 35.027934 44 44 35.027926 44 24 C 44 12.972074 35.027934 4 24 4 z M 24 7 C 27.174852 7 30.132364 7.8809063 32.671875 9.3886719 C 32.57538 9.4885937 32.491124 9.6031035 32.441406 9.7441406 L 32.242188 10.310547 C 32.097187 10.722547 32.237891 11.180406 32.587891 11.441406 L 32.933594 11.701172 C 33.466594 12.101172 33.466594 12.900781 32.933594 13.300781 L 32.494141 13.630859 C 32.318141 13.762859 32.106531 13.830078 31.894531 13.830078 C 31.742531 13.830078 31.588266 13.795609 31.447266 13.724609 L 30.212891 13.105469 C 30.072891 13.035469 29.918672 13 29.763672 13 L 27.306641 13 C 27.014641 13 26.738828 13.128609 26.548828 13.349609 L 24.240234 16.039062 C 23.998234 16.322063 23.934266 16.7175 24.072266 17.0625 L 24.283203 17.591797 C 24.445203 17.996797 24.826844 18.220703 25.214844 18.220703 C 25.465844 18.220703 25.720922 18.126734 25.919922 17.927734 C 25.919922 17.927734 26.562344 17.630063 26.777344 16.664062 C 26.865344 16.265062 27.24725 16 27.65625 16 L 28.599609 16 C 28.856609 16 29.103062 16.099344 29.289062 16.277344 L 29.783203 16.748047 C 30.189203 17.136047 30.197781 17.782687 29.800781 18.179688 L 29.029297 18.951172 C 28.936297 19.043172 28.826078 19.117969 28.705078 19.167969 L 25.628906 20.447266 C 25.543906 20.482266 25.464578 20.528937 25.392578 20.585938 L 22.615234 22.783203 C 22.437234 22.923203 22.220141 23 21.994141 23 L 21.5 23 C 20.672 23 20 23.672 20 24.5 C 20 25.328 20.672 26 21.5 26 L 21.732422 26 C 22.131422 26 22.522281 25.889641 22.863281 25.681641 L 24.896484 24.439453 C 25.058484 24.340453 25.238969 24.292969 25.417969 24.292969 C 25.698969 24.292969 25.974922 24.410766 26.169922 24.634766 L 27.064453 25.658203 C 27.254453 25.875203 27.529359 26 27.818359 26 L 28 26 C 28.552 26 29 25.552 29 25 L 29 24.394531 C 29 24.141531 29.095578 23.898891 29.267578 23.712891 L 30.410156 22.484375 C 30.485156 22.404375 30.572922 22.337156 30.669922 22.285156 L 32.527344 21.289062 C 32.681344 21.207062 32.841047 21.169922 32.998047 21.169922 C 33.522047 21.169922 34 21.588922 34 22.169922 L 34 23 C 34 23.552 33.552 24 33 24 L 32 24 C 31.448 24 31 24.448 31 25 C 31 25.552 31.448 26 32 26 L 33.46875 26 C 33.80075 26 34.112828 26.164453 34.298828 26.439453 L 36.462891 29.646484 C 36.656891 29.934484 36.972969 30.085938 37.292969 30.085938 C 37.510969 30.085938 37.732969 30.015187 37.917969 29.867188 L 38.626953 29.300781 C 38.862953 29.110781 39 28.822531 39 28.519531 L 39 28 C 39 27.448 38.552 27 38 27 C 37.448 27 37 26.552 37 26 C 37 25.448 37.448 25 38 25 L 38.359375 25 C 38.452375 25 38.544766 24.986937 38.634766 24.960938 L 40.986328 24.279297 C 40.919902 28.380916 39.412926 32.119948 36.943359 35.019531 C 36.979189 34.910768 37 34.797073 37 34.681641 L 37 34.085938 C 37 33.485937 36.514063 33 35.914062 33 C 35.548063 33 35.205859 32.815766 35.005859 32.509766 L 32.808594 28.578125 C 32.601594 28.262125 32.256391 28.087891 31.900391 28.087891 C 31.737391 28.087891 31.571016 28.124172 31.416016 28.201172 L 29.107422 29.466797 C 28.955422 29.542797 28.789047 29.580078 28.623047 29.580078 C 28.508047 29.580078 28.39225 29.562391 28.28125 29.525391 L 24.548828 28.173828 C 24.214828 28.062828 23.868484 28.007812 23.521484 28.007812 C 23.174484 28.007812 22.826187 28.062828 22.492188 28.173828 L 19.099609 29.525391 C 18.826609 29.616391 18.599703 29.811359 18.470703 30.068359 L 17.222656 32.556641 C 17.081656 32.838641 17.069453 33.166031 17.189453 33.457031 L 18.378906 36.328125 C 18.546906 36.734125 18.941859 37 19.380859 37 L 21.457031 37 C 21.799031 37 22.121172 36.839406 22.326172 36.566406 L 22.632812 36.158203 C 22.849812 35.868203 23.175953 35.724609 23.501953 35.724609 C 23.827953 35.724609 24.151141 35.869203 24.369141 36.158203 L 24.783203 36.710938 C 24.923203 36.898938 25 37.126328 25 37.361328 L 25 40.949219 C 24.667105 40.96854 24.33784 41 24 41 C 14.593385 41 7 33.406609 7 24 C 7 22.661441 7.1700722 21.365658 7.4609375 20.117188 L 9.0488281 19.207031 C 9.1828281 19.130031 9.3323281 19.091797 9.4863281 19.091797 L 10.117188 19.091797 C 10.605187 19.091797 11.001953 18.695031 11.001953 18.207031 L 11.001953 15.066406 C 11.001953 14.578406 11.396766 14.181641 11.884766 14.181641 C 12.266766 14.181641 12.605609 13.937219 12.724609 13.574219 L 14.314453 10.027344 C 15.121909 9.467268 15.983319 8.9856208 16.884766 8.5703125 L 15.056641 12.558594 C 14.821641 13.267594 15.348703 14 16.095703 14 L 18.332031 14 C 18.821031 14 19.288766 13.806937 19.634766 13.460938 L 21.775391 11.320312 C 21.980391 11.115312 22.095703 10.837875 22.095703 10.546875 L 22.095703 10.09375 C 22.095703 9.49075 21.605953 9 21.001953 9 L 20.548828 9 C 20.258828 9 19.979437 9.1153125 19.773438 9.3203125 L 19.095703 10 L 19.083984 8.7636719 C 19.080711 8.3839698 18.887769 8.0723593 18.613281 7.8808594 C 20.3066 7.3171846 22.114407 7 24 7 z M 36.330078 12.349609 L 36.371094 12.351562 C 38.633923 14.754456 40.196999 17.8133 40.755859 21.222656 L 38.076172 22 L 38 22 C 37.655 22 37.32 22.043953 37 22.126953 C 36.976 19.951953 35.20825 18.186922 33.03125 18.169922 C 33.07525 17.924922 33.09675 17.676781 33.09375 17.425781 C 33.09075 17.170781 33.062719 16.917922 33.011719 16.669922 C 33.472719 16.535922 33.908922 16.318297 34.294922 16.029297 L 34.734375 15.699219 C 35.736375 14.948219 36.333984 13.752 36.333984 12.5 C 36.333984 12.45 36.332078 12.399609 36.330078 12.349609 z M 21 16 C 20.448 16 20 16.448 20 17 L 20 18 C 20 18.552 20.448 19 21 19 C 21.552 19 22 18.552 22 18 L 22 17 C 22 16.448 21.552 16 21 16 z M 23.521484 31.009766 C 23.543484 31.009766 23.564937 31.012578 23.585938 31.017578 L 27.259766 32.349609 L 27.298828 32.363281 L 27.335938 32.376953 C 27.751938 32.514953 28.184047 32.583984 28.623047 32.583984 C 29.252047 32.583984 29.882313 32.435297 30.445312 32.154297 L 30.498047 32.128906 L 30.548828 32.101562 L 31.152344 31.769531 L 32.386719 33.976562 L 32.4375 34.068359 L 32.494141 34.15625 C 32.759141 34.56025 33.088891 34.9075 33.462891 35.1875 L 31.193359 39.392578 C 30.178996 39.866225 29.112256 40.24223 28 40.509766 L 28 37.363281 C 28 36.485281 27.710594 35.614109 27.183594 34.912109 L 26.769531 34.359375 C 26.002531 33.336375 24.78 32.726562 23.5 32.726562 C 22.421 32.726562 21.382047 33.161109 20.623047 33.912109 L 20.296875 33.123047 L 20.824219 32.070312 L 23.476562 31.013672 C 23.491563 31.010672 23.506484 31.009766 23.521484 31.009766 z"></path>
				</svg>
			</button>
			<button id="rubutton" onclick="showRU()" class="p-2 lg:text-lg text-zinc-300 /rounded-3xl duration-300 hover:bg-zinc-800 active:scale-95 cursor-pointer">Русский</button>
			<button id="enbutton" onclick="showEN()" class="p-2 lg:text-lg text-zinc-300 rounded-3xl duration-300 hover:bg-zinc-800 rounded-l-none active:scale-95 cursor-pointer">English</button>
		</div>
	</div>
	<style>
		.RU, .EN {
		transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
		transform-origin: top center;
		}
		.RU.hiding, .EN.hiding {
		opacity: 0;
		transform: scale(0.95) translateY(-10px);
		pointer-events: none;
		}
		.RU.showing, .EN.showing {
		animation: slideInScale 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
		}
		@keyframes slideInScale {
		0% {
		opacity: 0;
		transform: scale(0.9) translateY(-20px);
		}
		100% {
		opacity: 1;
		transform: scale(1) translateY(0);
		}
		}
	</style>
	<script>
		function showALL(){
		    // Показываем все блоки без анимации, если они уже видны
		    const hiddenRU = $('.RU').hasClass('hidden');
		    const hiddenEN = $('.EN').hasClass('hidden');
		    
		    if (hiddenRU || hiddenEN) {
		        // Анимируем только скрытые блоки
		        if (hiddenRU) {
		            $('.RU').removeClass('hidden').addClass('showing');
		            setTimeout(() => $('.RU').removeClass('showing'), 500);
		        }
		        if (hiddenEN) {
		            $('.EN').removeClass('hidden').addClass('showing');
		            setTimeout(() => $('.EN').removeClass('showing'), 500);
		        }
		    }
		    
		    $('#allbutton').addClass('bg-zinc-800');
		    $('#enbutton').removeClass('bg-zinc-800');
		    $('#rubutton').removeClass('bg-zinc-800');
		}
		
		function showRU(){
		    const ruVisible = !$('.RU').hasClass('hidden');
		    
		    // Скрываем EN с анимацией
		    if (!$('.EN').hasClass('hidden')) {
		        $('.EN').addClass('hiding');
		        setTimeout(() => {
		            $('.EN').addClass('hidden').removeClass('hiding');
		        }, 400);
		    }
		    
		    // Показываем RU только если они скрыты
		    if (!ruVisible) {
		        setTimeout(() => {
		            $('.RU').removeClass('hidden').addClass('showing');
		            setTimeout(() => $('.RU').removeClass('showing'), 500);
		        }, $('.EN').hasClass('hidden') ? 0 : 400);
		    }
		    
		    $('#allbutton').removeClass('bg-zinc-800');
		    $('#enbutton').removeClass('bg-zinc-800');
		    $('#rubutton').addClass('bg-zinc-800');
		}
		
		function showEN(){
		    const enVisible = !$('.EN').hasClass('hidden');
		    const ruVisible = !$('.RU').hasClass('hidden');
		    
		    // Скрываем RU с анимацией
		    //if (ruVisible) {
		        $('.RU').addClass('hiding');
		        setTimeout(() => {
		            $('.RU').addClass('hidden').removeClass('hiding');
		        }, 400);
		    //}
		    
		    // Показываем EN только если они скрыты, с задержкой если RU видимы
		    //if (!enVisible) {
		        setTimeout(() => {
		            $('.EN').removeClass('hidden').addClass('showing');
		            setTimeout(() => $('.EN').removeClass('showing'), 500);
		        }, ruVisible ? 400 : 0);
		    //}
		    
		    $('#allbutton').removeClass('bg-zinc-800');
		    $('#enbutton').addClass('bg-zinc-800');
		    $('#rubutton').removeClass('bg-zinc-800');
		}
	</script>
	<div class="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 px-3 lg:px-0 duration-300 transition-all">
		<div data-fancybox data-src="#bezopasnost" class="RU relative bg-zinc-900 rounded-2xl shadow p-3 lg:p-6 gap-3 flex flex-col items-center justify-center duration-300 hover:bg-zinc-800/70 cursor-pointer active:scale-95">
			<span class="text-sm p-1 bg-purple-500/50 rounded-2xl rounded-bl-none rounded-tr-none absolute top-0 left-0 text-default duration-300 shadow">Русский</span>
			<svg class="w-16 h-16 fill-purple-500 hidden" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
				<path d="M 12.5 4 C 10.032499 4 8 6.0324991 8 8.5 L 8 39.5 C 8 41.967501 10.032499 44 12.5 44 L 35.5 44 C 37.967501 44 40 41.967501 40 39.5 L 40 18.5 A 1.50015 1.50015 0 0 0 39.560547 17.439453 L 39.544922 17.423828 L 26.560547 4.4394531 A 1.50015 1.50015 0 0 0 25.5 4 L 12.5 4 z M 12.5 7 L 24 7 L 24 15.5 C 24 17.967501 26.032499 20 28.5 20 L 37 20 L 37 39.5 C 37 40.346499 36.346499 41 35.5 41 L 12.5 41 C 11.653501 41 11 40.346499 11 39.5 L 11 8.5 C 11 7.6535009 11.653501 7 12.5 7 z M 27 9.1210938 L 34.878906 17 L 28.5 17 C 27.653501 17 27 16.346499 27 15.5 L 27 9.1210938 z M 17.5 25 A 1.50015 1.50015 0 1 0 17.5 28 L 30.5 28 A 1.50015 1.50015 0 1 0 30.5 25 L 17.5 25 z M 17.5 32 A 1.50015 1.50015 0 1 0 17.5 35 L 26.5 35 A 1.50015 1.50015 0 1 0 26.5 32 L 17.5 32 z"></path>
			</svg>
			<svg xmlns="http://www.w3.org/2000/svg" class="w-16 h-16" viewBox="0,0,256,256">
				<defs>
					<linearGradient x1="16.09" y1="13.794" x2="29.568" y2="27.272" gradientUnits="userSpaceOnUse" id="color-1_Vq0a3AGLLhJ6_gr1">
						<stop offset="0" stop-color="#7259ff" stop-opacity="0.95"></stop>
						<stop offset="1" stop-color="#7259ff" stop-opacity="0.5"></stop>
					</linearGradient>
					<linearGradient x1="23.146" y1="26.146" x2="24.854" y2="27.854" gradientUnits="userSpaceOnUse" id="color-2_Vq0a3AGLLhJ6_gr2">
						<stop offset="0" stop-color="#ffffff" stop-opacity="0.8"></stop>
						<stop offset="0.519" stop-color="#ffffff" stop-opacity="0.5"></stop>
						<stop offset="1" stop-color="#ffffff" stop-opacity="0.6"></stop>
					</linearGradient>
					<linearGradient x1="23.146" y1="22.146" x2="24.854" y2="23.854" gradientUnits="userSpaceOnUse" id="color-3_Vq0a3AGLLhJ6_gr3">
						<stop offset="0" stop-color="#ffffff" stop-opacity="0.8"></stop>
						<stop offset="0.519" stop-color="#ffffff" stop-opacity="0.5"></stop>
						<stop offset="1" stop-color="#ffffff" stop-opacity="0.6"></stop>
					</linearGradient>
					<linearGradient x1="23.146" y1="18.146" x2="24.854" y2="19.854" gradientUnits="userSpaceOnUse" id="color-4_Vq0a3AGLLhJ6_gr4">
						<stop offset="0" stop-color="#ffffff" stop-opacity="0.8"></stop>
						<stop offset="0.519" stop-color="#ffffff" stop-opacity="0.5"></stop>
						<stop offset="1" stop-color="#ffffff" stop-opacity="0.6"></stop>
					</linearGradient>
					<linearGradient x1="23.146" y1="14.146" x2="24.854" y2="15.854" gradientUnits="userSpaceOnUse" id="color-5_Vq0a3AGLLhJ6_gr5">
						<stop offset="0" stop-color="#ffffff" stop-opacity="0.8"></stop>
						<stop offset="0.519" stop-color="#ffffff" stop-opacity="0.5"></stop>
						<stop offset="1" stop-color="#ffffff" stop-opacity="0.6"></stop>
					</linearGradient>
					<linearGradient x1="14.901" y1="16.802" x2="3.433" y2="28.271" gradientUnits="userSpaceOnUse" id="color-6_Vq0a3AGLLhJ6_gr6">
						<stop offset="0" stop-color="#7259ff" stop-opacity="0.95"></stop>
						<stop offset="1" stop-color="#7259ff" stop-opacity="0.5"></stop>
					</linearGradient>
					<linearGradient x1="8.854" y1="26.146" x2="7.146" y2="27.854" gradientUnits="userSpaceOnUse" id="color-7_Vq0a3AGLLhJ6_gr7">
						<stop offset="0" stop-color="#ffffff" stop-opacity="0.8"></stop>
						<stop offset="0.519" stop-color="#ffffff" stop-opacity="0.5"></stop>
						<stop offset="1" stop-color="#ffffff" stop-opacity="0.6"></stop>
					</linearGradient>
					<linearGradient x1="8.854" y1="22.146" x2="7.146" y2="23.854" gradientUnits="userSpaceOnUse" id="color-8_Vq0a3AGLLhJ6_gr8">
						<stop offset="0" stop-color="#ffffff" stop-opacity="0.8"></stop>
						<stop offset="0.519" stop-color="#ffffff" stop-opacity="0.5"></stop>
						<stop offset="1" stop-color="#ffffff" stop-opacity="0.6"></stop>
					</linearGradient>
					<linearGradient x1="8.854" y1="18.146" x2="7.146" y2="19.854" gradientUnits="userSpaceOnUse" id="color-9_Vq0a3AGLLhJ6_gr9">
						<stop offset="0" stop-color="#ffffff" stop-opacity="0.8"></stop>
						<stop offset="0.519" stop-color="#ffffff" stop-opacity="0.5"></stop>
						<stop offset="1" stop-color="#ffffff" stop-opacity="0.6"></stop>
					</linearGradient>
					<linearGradient x1="6.566" y1="7.859" x2="25.362" y2="26.655" gradientUnits="userSpaceOnUse" id="color-10_Vq0a3AGLLhJ6_gr10">
						<stop offset="0" stop-color="#2680ff" stop-opacity="0.95"></stop>
						<stop offset="1" stop-color="#2680ff" stop-opacity="0.5"></stop>
					</linearGradient>
					<linearGradient x1="13.146" y1="26.146" x2="14.854" y2="27.854" gradientUnits="userSpaceOnUse" id="color-11_Vq0a3AGLLhJ6_gr11">
						<stop offset="0" stop-color="#ffffff" stop-opacity="0.8"></stop>
						<stop offset="0.519" stop-color="#ffffff" stop-opacity="0.5"></stop>
						<stop offset="1" stop-color="#ffffff" stop-opacity="0.6"></stop>
					</linearGradient>
					<linearGradient x1="17.146" y1="26.146" x2="18.854" y2="27.854" gradientUnits="userSpaceOnUse" id="color-12_Vq0a3AGLLhJ6_gr12">
						<stop offset="0" stop-color="#ffffff" stop-opacity="0.8"></stop>
						<stop offset="0.519" stop-color="#ffffff" stop-opacity="0.5"></stop>
						<stop offset="1" stop-color="#ffffff" stop-opacity="0.6"></stop>
					</linearGradient>
					<linearGradient x1="13.146" y1="22.146" x2="14.854" y2="23.854" gradientUnits="userSpaceOnUse" id="color-13_Vq0a3AGLLhJ6_gr13">
						<stop offset="0" stop-color="#ffffff" stop-opacity="0.8"></stop>
						<stop offset="0.519" stop-color="#ffffff" stop-opacity="0.5"></stop>
						<stop offset="1" stop-color="#ffffff" stop-opacity="0.6"></stop>
					</linearGradient>
					<linearGradient x1="17.146" y1="22.146" x2="18.854" y2="23.854" gradientUnits="userSpaceOnUse" id="color-14_Vq0a3AGLLhJ6_gr14">
						<stop offset="0" stop-color="#ffffff" stop-opacity="0.8"></stop>
						<stop offset="0.519" stop-color="#ffffff" stop-opacity="0.5"></stop>
						<stop offset="1" stop-color="#ffffff" stop-opacity="0.6"></stop>
					</linearGradient>
					<linearGradient x1="13.146" y1="18.146" x2="14.854" y2="19.854" gradientUnits="userSpaceOnUse" id="color-15_Vq0a3AGLLhJ6_gr15">
						<stop offset="0" stop-color="#ffffff" stop-opacity="0.8"></stop>
						<stop offset="0.519" stop-color="#ffffff" stop-opacity="0.5"></stop>
						<stop offset="1" stop-color="#ffffff" stop-opacity="0.6"></stop>
					</linearGradient>
					<linearGradient x1="17.146" y1="18.146" x2="18.854" y2="19.854" gradientUnits="userSpaceOnUse" id="color-16_Vq0a3AGLLhJ6_gr16">
						<stop offset="0" stop-color="#ffffff" stop-opacity="0.8"></stop>
						<stop offset="0.519" stop-color="#ffffff" stop-opacity="0.5"></stop>
						<stop offset="1" stop-color="#ffffff" stop-opacity="0.6"></stop>
					</linearGradient>
					<linearGradient x1="13.146" y1="14.146" x2="14.854" y2="15.854" gradientUnits="userSpaceOnUse" id="color-17_Vq0a3AGLLhJ6_gr17">
						<stop offset="0" stop-color="#ffffff" stop-opacity="0.8"></stop>
						<stop offset="0.519" stop-color="#ffffff" stop-opacity="0.5"></stop>
						<stop offset="1" stop-color="#ffffff" stop-opacity="0.6"></stop>
					</linearGradient>
					<linearGradient x1="17.146" y1="14.146" x2="18.854" y2="15.854" gradientUnits="userSpaceOnUse" id="color-18_Vq0a3AGLLhJ6_gr18">
						<stop offset="0" stop-color="#ffffff" stop-opacity="0.8"></stop>
						<stop offset="0.519" stop-color="#ffffff" stop-opacity="0.5"></stop>
						<stop offset="1" stop-color="#ffffff" stop-opacity="0.6"></stop>
					</linearGradient>
					<linearGradient x1="13.146" y1="10.146" x2="14.854" y2="11.854" gradientUnits="userSpaceOnUse" id="color-19_Vq0a3AGLLhJ6_gr19">
						<stop offset="0" stop-color="#ffffff" stop-opacity="0.8"></stop>
						<stop offset="0.519" stop-color="#ffffff" stop-opacity="0.5"></stop>
						<stop offset="1" stop-color="#ffffff" stop-opacity="0.6"></stop>
					</linearGradient>
					<linearGradient x1="17.146" y1="10.146" x2="18.854" y2="11.854" gradientUnits="userSpaceOnUse" id="color-20_Vq0a3AGLLhJ6_gr20">
						<stop offset="0" stop-color="#ffffff" stop-opacity="0.8"></stop>
						<stop offset="0.519" stop-color="#ffffff" stop-opacity="0.5"></stop>
						<stop offset="1" stop-color="#ffffff" stop-opacity="0.6"></stop>
					</linearGradient>
					<linearGradient x1="13.146" y1="6.146" x2="14.854" y2="7.854" gradientUnits="userSpaceOnUse" id="color-21_Vq0a3AGLLhJ6_gr21">
						<stop offset="0" stop-color="#ffffff" stop-opacity="0.8"></stop>
						<stop offset="0.519" stop-color="#ffffff" stop-opacity="0.5"></stop>
						<stop offset="1" stop-color="#ffffff" stop-opacity="0.6"></stop>
					</linearGradient>
					<linearGradient x1="17.146" y1="6.146" x2="18.854" y2="7.854" gradientUnits="userSpaceOnUse" id="color-22_Vq0a3AGLLhJ6_gr22">
						<stop offset="0" stop-color="#ffffff" stop-opacity="0.8"></stop>
						<stop offset="0.519" stop-color="#ffffff" stop-opacity="0.5"></stop>
						<stop offset="1" stop-color="#ffffff" stop-opacity="0.6"></stop>
					</linearGradient>
					<linearGradient x1="5.439" y1="9.146" x2="26.561" y2="30.268" gradientUnits="userSpaceOnUse" id="color-23_Vq0a3AGLLhJ6_gr23">
						<stop offset="0" stop-color="#ffffff" stop-opacity="0.6"></stop>
						<stop offset="0.493" stop-color="#ffffff" stop-opacity="0"></stop>
						<stop offset="0.997" stop-color="#ffffff" stop-opacity="0.3"></stop>
					</linearGradient>
				</defs>
				<g fill-opacity="0" fill="#dddddd" fill-rule="nonzero" stroke="none" stroke-width="1" stroke-linecap="butt" stroke-linejoin="miter" stroke-miterlimit="10" stroke-dasharray="" stroke-dashoffset="0" font-family="none" font-weight="none" font-size="none" text-anchor="none" style="mix-blend-mode: normal">
					<path d="M0,256v-256h256v256z" id="bgRectangle"></path>
				</g>
				<g fill="none" fill-rule="nonzero" stroke="none" stroke-width="1" stroke-linecap="butt" stroke-linejoin="miter" stroke-miterlimit="10" stroke-dasharray="" stroke-dashoffset="0" font-family="none" font-weight="none" font-size="none" text-anchor="none" style="mix-blend-mode: normal">
					<g transform="scale(8,8)">
						<path d="M25,31h-4v-22l4.894,2.447c0.678,0.339 1.106,1.032 1.106,1.789v15.764c0,1.105 -0.895,2 -2,2z" fill="url(#color-1_Vq0a3AGLLhJ6_gr1)"></path>
						<path d="M24.5,28h-1c-0.276,0 -0.5,-0.224 -0.5,-0.5v-1c0,-0.276 0.224,-0.5 0.5,-0.5h1c0.276,0 0.5,0.224 0.5,0.5v1c0,0.276 -0.224,0.5 -0.5,0.5z" fill="url(#color-2_Vq0a3AGLLhJ6_gr2)"></path>
						<path d="M24.5,24h-1c-0.276,0 -0.5,-0.224 -0.5,-0.5v-1c0,-0.276 0.224,-0.5 0.5,-0.5h1c0.276,0 0.5,0.224 0.5,0.5v1c0,0.276 -0.224,0.5 -0.5,0.5z" fill="url(#color-3_Vq0a3AGLLhJ6_gr3)"></path>
						<path d="M24.5,20h-1c-0.276,0 -0.5,-0.224 -0.5,-0.5v-1c0,-0.276 0.224,-0.5 0.5,-0.5h1c0.276,0 0.5,0.224 0.5,0.5v1c0,0.276 -0.224,0.5 -0.5,0.5z" fill="url(#color-4_Vq0a3AGLLhJ6_gr4)"></path>
						<path d="M24.5,16h-1c-0.276,0 -0.5,-0.224 -0.5,-0.5v-1c0,-0.276 0.224,-0.5 0.5,-0.5h1c0.276,0 0.5,0.224 0.5,0.5v1c0,0.276 -0.224,0.5 -0.5,0.5z" fill="url(#color-5_Vq0a3AGLLhJ6_gr5)"></path>
						<path d="M7,31h4v-18l-4.894,2.447c-0.678,0.339 -1.106,1.032 -1.106,1.789v11.764c0,1.105 0.895,2 2,2z" fill="url(#color-6_Vq0a3AGLLhJ6_gr6)"></path>
						<path d="M7.5,28h1c0.276,0 0.5,-0.224 0.5,-0.5v-1c0,-0.276 -0.224,-0.5 -0.5,-0.5h-1c-0.276,0 -0.5,0.224 -0.5,0.5v1c0,0.276 0.224,0.5 0.5,0.5z" fill="url(#color-7_Vq0a3AGLLhJ6_gr7)"></path>
						<path d="M7.5,24h1c0.276,0 0.5,-0.224 0.5,-0.5v-1c0,-0.276 -0.224,-0.5 -0.5,-0.5h-1c-0.276,0 -0.5,0.224 -0.5,0.5v1c0,0.276 0.224,0.5 0.5,0.5z" fill="url(#color-8_Vq0a3AGLLhJ6_gr8)"></path>
						<path d="M7.5,20h1c0.276,0 0.5,-0.224 0.5,-0.5v-1c0,-0.276 -0.224,-0.5 -0.5,-0.5h-1c-0.276,0 -0.5,0.224 -0.5,0.5v1c0,0.276 0.224,0.5 0.5,0.5z" fill="url(#color-9_Vq0a3AGLLhJ6_gr9)"></path>
						<path d="M19,3v-1c0,-0.552 -0.448,-1 -1,-1h-4c-0.552,0 -1,0.448 -1,1v1h-1c-0.552,0 -1,0.448 -1,1v27h10v-27c0,-0.552 -0.448,-1 -1,-1z" fill="url(#color-10_Vq0a3AGLLhJ6_gr10)"></path>
						<path d="M14.5,28h-1c-0.276,0 -0.5,-0.224 -0.5,-0.5v-1c0,-0.276 0.224,-0.5 0.5,-0.5h1c0.276,0 0.5,0.224 0.5,0.5v1c0,0.276 -0.224,0.5 -0.5,0.5z" fill="url(#color-11_Vq0a3AGLLhJ6_gr11)"></path>
						<path d="M18.5,28h-1c-0.276,0 -0.5,-0.224 -0.5,-0.5v-1c0,-0.276 0.224,-0.5 0.5,-0.5h1c0.276,0 0.5,0.224 0.5,0.5v1c0,0.276 -0.224,0.5 -0.5,0.5z" fill="url(#color-12_Vq0a3AGLLhJ6_gr12)"></path>
						<path d="M14.5,24h-1c-0.276,0 -0.5,-0.224 -0.5,-0.5v-1c0,-0.276 0.224,-0.5 0.5,-0.5h1c0.276,0 0.5,0.224 0.5,0.5v1c0,0.276 -0.224,0.5 -0.5,0.5z" fill="url(#color-13_Vq0a3AGLLhJ6_gr13)"></path>
						<path d="M18.5,24h-1c-0.276,0 -0.5,-0.224 -0.5,-0.5v-1c0,-0.276 0.224,-0.5 0.5,-0.5h1c0.276,0 0.5,0.224 0.5,0.5v1c0,0.276 -0.224,0.5 -0.5,0.5z" fill="url(#color-14_Vq0a3AGLLhJ6_gr14)"></path>
						<path d="M14.5,20h-1c-0.276,0 -0.5,-0.224 -0.5,-0.5v-1c0,-0.276 0.224,-0.5 0.5,-0.5h1c0.276,0 0.5,0.224 0.5,0.5v1c0,0.276 -0.224,0.5 -0.5,0.5z" fill="url(#color-15_Vq0a3AGLLhJ6_gr15)"></path>
						<path d="M18.5,20h-1c-0.276,0 -0.5,-0.224 -0.5,-0.5v-1c0,-0.276 0.224,-0.5 0.5,-0.5h1c0.276,0 0.5,0.224 0.5,0.5v1c0,0.276 -0.224,0.5 -0.5,0.5z" fill="url(#color-16_Vq0a3AGLLhJ6_gr16)"></path>
						<path d="M14.5,16h-1c-0.276,0 -0.5,-0.224 -0.5,-0.5v-1c0,-0.276 0.224,-0.5 0.5,-0.5h1c0.276,0 0.5,0.224 0.5,0.5v1c0,0.276 -0.224,0.5 -0.5,0.5z" fill="url(#color-17_Vq0a3AGLLhJ6_gr17)"></path>
						<path d="M18.5,16h-1c-0.276,0 -0.5,-0.224 -0.5,-0.5v-1c0,-0.276 0.224,-0.5 0.5,-0.5h1c0.276,0 0.5,0.224 0.5,0.5v1c0,0.276 -0.224,0.5 -0.5,0.5z" fill="url(#color-18_Vq0a3AGLLhJ6_gr18)"></path>
						<path d="M14.5,12h-1c-0.276,0 -0.5,-0.224 -0.5,-0.5v-1c0,-0.276 0.224,-0.5 0.5,-0.5h1c0.276,0 0.5,0.224 0.5,0.5v1c0,0.276 -0.224,0.5 -0.5,0.5z" fill="url(#color-19_Vq0a3AGLLhJ6_gr19)"></path>
						<path d="M18.5,12h-1c-0.276,0 -0.5,-0.224 -0.5,-0.5v-1c0,-0.276 0.224,-0.5 0.5,-0.5h1c0.276,0 0.5,0.224 0.5,0.5v1c0,0.276 -0.224,0.5 -0.5,0.5z" fill="url(#color-20_Vq0a3AGLLhJ6_gr20)"></path>
						<path d="M14.5,8h-1c-0.276,0 -0.5,-0.224 -0.5,-0.5v-1c0,-0.276 0.224,-0.5 0.5,-0.5h1c0.276,0 0.5,0.224 0.5,0.5v1c0,0.276 -0.224,0.5 -0.5,0.5z" fill="url(#color-21_Vq0a3AGLLhJ6_gr21)"></path>
						<path d="M18.5,8h-1c-0.276,0 -0.5,-0.224 -0.5,-0.5v-1c0,-0.276 0.224,-0.5 0.5,-0.5h1c0.276,0 0.5,0.224 0.5,0.5v1c0,0.276 -0.224,0.5 -0.5,0.5z" fill="url(#color-22_Vq0a3AGLLhJ6_gr22)"></path>
						<path d="M18,1.5c0.276,0 0.5,0.224 0.5,0.5v1v0.5h0.5h1c0.276,0 0.5,0.224 0.5,0.5v5v0.309l0.276,0.138l4.894,2.447c0.511,0.256 0.829,0.77 0.829,1.342v15.764c0,0.827 -0.673,1.5 -1.5,1.5h-17.999c-0.827,0 -1.5,-0.673 -1.5,-1.5v-11.764c0,-0.572 0.318,-1.086 0.829,-1.342l4.894,-2.447l0.276,-0.138v-0.309v-9c0,-0.276 0.224,-0.5 0.5,-0.5h1h0.5v-0.5v-1c0,-0.276 0.224,-0.5 0.5,-0.5h4.001M18,1h-4c-0.552,0 -1,0.448 -1,1v1h-1c-0.552,0 -1,0.448 -1,1v9l-4.894,2.447c-0.678,0.339 -1.106,1.032 -1.106,1.789v11.764c0,1.105 0.895,2 2,2h18c1.105,0 2,-0.895 2,-2v-15.764c0,-0.758 -0.428,-1.45 -1.106,-1.789l-4.894,-2.447v-5c0,-0.552 -0.448,-1 -1,-1h-1v-1c0,-0.552 -0.448,-1 -1,-1z" fill="url(#color-23_Vq0a3AGLLhJ6_gr23)"></path>
					</g>
				</g>
			</svg>
			<span class="text-zinc-200 text-center">Политика обработки персональных данных</span>
		</div>
		<div data-fancybox data-src="#rules-ru" class="RU relative bg-zinc-900 rounded-2xl shadow p-3 lg:p-6 gap-3 flex flex-col items-center justify-center duration-300 hover:bg-zinc-800/70 cursor-pointer active:scale-95">
			<span class="text-sm p-1 bg-purple-500/50 rounded-2xl rounded-bl-none rounded-tr-none absolute top-0 left-0 text-default duration-300 shadow">Русский</span>
			<svg class="w-16 h-16 fill-purple-500 hidden" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
				<path d="M 12.5 4 C 10.032499 4 8 6.0324991 8 8.5 L 8 39.5 C 8 41.967501 10.032499 44 12.5 44 L 35.5 44 C 37.967501 44 40 41.967501 40 39.5 L 40 18.5 A 1.50015 1.50015 0 0 0 39.560547 17.439453 L 39.544922 17.423828 L 26.560547 4.4394531 A 1.50015 1.50015 0 0 0 25.5 4 L 12.5 4 z M 12.5 7 L 24 7 L 24 15.5 C 24 17.967501 26.032499 20 28.5 20 L 37 20 L 37 39.5 C 37 40.346499 36.346499 41 35.5 41 L 12.5 41 C 11.653501 41 11 40.346499 11 39.5 L 11 8.5 C 11 7.6535009 11.653501 7 12.5 7 z M 27 9.1210938 L 34.878906 17 L 28.5 17 C 27.653501 17 27 16.346499 27 15.5 L 27 9.1210938 z M 17.5 25 A 1.50015 1.50015 0 1 0 17.5 28 L 30.5 28 A 1.50015 1.50015 0 1 0 30.5 25 L 17.5 25 z M 17.5 32 A 1.50015 1.50015 0 1 0 17.5 35 L 26.5 35 A 1.50015 1.50015 0 1 0 26.5 32 L 17.5 32 z"></path>
			</svg>
			<svg xmlns="http://www.w3.org/2000/svg" class="w-16 h-16" viewBox="0 0 32 32">
				<linearGradient id="RGNWhQdzV6900AW9WSy0xa_IO7KMhAWvLJO_gr1" x1="4.892" x2="27.108" y1="5.284" y2="27.5" gradientUnits="userSpaceOnUse">
					<stop offset="0" stop-color="#00e9ff" stop-opacity=".95"></stop>
					<stop offset="1" stop-color="#00e9ff" stop-opacity=".5"></stop>
				</linearGradient>
				<path fill="url(#RGNWhQdzV6900AW9WSy0xa_IO7KMhAWvLJO_gr1)" d="M24,3.004H8c-1.105,0-2,0.895-2,2v23.333c0,0.523,0.583,0.836,1.019,0.545L9,27.561 l2.481,1.29c0.33,0.171,0.717,0.192,1.063,0.057L16,27.561l3.456,1.347c0.346,0.135,0.733,0.114,1.063-0.057L23,27.561 l1.981,1.321C25.417,29.172,26,28.86,26,28.337V5.004C26,3.899,25.105,3.004,24,3.004z"></path>
				<linearGradient id="RGNWhQdzV6900AW9WSy0xb_IO7KMhAWvLJO_gr2" x1="4.892" x2="27.108" y1="5.284" y2="27.5" gradientUnits="userSpaceOnUse">
					<stop offset="0" stop-color="#fff" stop-opacity=".6"></stop>
					<stop offset=".493" stop-color="#fff" stop-opacity="0"></stop>
					<stop offset=".997" stop-color="#fff" stop-opacity=".3"></stop>
				</linearGradient>
				<path fill="url(#RGNWhQdzV6900AW9WSy0xb_IO7KMhAWvLJO_gr2)" d="M24,3.504c0.827,0,1.5,0.673,1.5,1.5 v23.333c0,0.108-0.092,0.156-0.157,0.156c-0.029,0-0.057-0.009-0.084-0.027l-1.981-1.321l-0.246-0.164l-0.262,0.136l-2.482,1.29 c-0.112,0.058-0.238,0.089-0.364,0.089c-0.098,0-0.195-0.018-0.287-0.054l-3.456-1.347L16,27.025l-0.182,0.071l-3.456,1.347 c-0.092,0.036-0.188,0.054-0.287,0.054c-0.126,0-0.252-0.031-0.364-0.089l-2.482-1.29l-0.262-0.136l-0.246,0.164l-1.981,1.321 c-0.027,0.018-0.055,0.027-0.084,0.027c-0.065,0-0.157-0.049-0.157-0.156V5.004c0-0.827,0.673-1.5,1.5-1.5H24 M24,3.004H8 c-1.105,0-2,0.895-2,2v23.333c0,0.386,0.316,0.656,0.657,0.656c0.122,0,0.247-0.035,0.362-0.111L9,27.561l2.482,1.29 c0.186,0.097,0.39,0.145,0.595,0.145c0.158,0,0.317-0.029,0.468-0.088L16,27.561l3.456,1.347c0.151,0.059,0.31,0.088,0.468,0.088 c0.205,0,0.409-0.049,0.595-0.145L23,27.561l1.981,1.321c0.115,0.076,0.24,0.111,0.362,0.111c0.341,0,0.657-0.271,0.657-0.656 V5.004C26,3.899,25.105,3.004,24,3.004L24,3.004z"></path>
				<linearGradient id="RGNWhQdzV6900AW9WSy0xc_IO7KMhAWvLJO_gr3" x1="11.793" x2="16.207" y1="5.793" y2="10.207" gradientUnits="userSpaceOnUse">
					<stop offset="0" stop-color="#fff" stop-opacity=".8"></stop>
					<stop offset=".519" stop-color="#fff" stop-opacity=".5"></stop>
					<stop offset="1" stop-color="#fff" stop-opacity=".6"></stop>
				</linearGradient>
				<path fill="url(#RGNWhQdzV6900AW9WSy0xc_IO7KMhAWvLJO_gr3)" d="M17,7c-0.186,0-5.814,0-6,0	c-0.552,0-1,0.448-1,1c0,0.552,0.448,1,1,1c0.186,0,5.814,0,6,0c0.552,0,1-0.448,1-1C18,7.448,17.552,7,17,7z"></path>
				<linearGradient id="RGNWhQdzV6900AW9WSy0xd_IO7KMhAWvLJO_gr4" x1="20.293" x2="21.707" y1="7.293" y2="8.707" gradientUnits="userSpaceOnUse">
					<stop offset="0" stop-color="#fff" stop-opacity=".8"></stop>
					<stop offset=".519" stop-color="#fff" stop-opacity=".5"></stop>
					<stop offset="1" stop-color="#fff" stop-opacity=".6"></stop>
				</linearGradient>
				<circle cx="21" cy="8" r="1" fill="url(#RGNWhQdzV6900AW9WSy0xd_IO7KMhAWvLJO_gr4)"></circle>
				<linearGradient id="RGNWhQdzV6900AW9WSy0xe_IO7KMhAWvLJO_gr5" x1="11.793" x2="16.207" y1="10.793" y2="15.207" gradientUnits="userSpaceOnUse">
					<stop offset="0" stop-color="#fff" stop-opacity=".8"></stop>
					<stop offset=".519" stop-color="#fff" stop-opacity=".5"></stop>
					<stop offset="1" stop-color="#fff" stop-opacity=".6"></stop>
				</linearGradient>
				<path fill="url(#RGNWhQdzV6900AW9WSy0xe_IO7KMhAWvLJO_gr5)" d="M17,12c-0.186,0-5.814,0-6,0	c-0.552,0-1,0.448-1,1c0,0.552,0.448,1,1,1c0.186,0,5.814,0,6,0c0.552,0,1-0.448,1-1C18,12.448,17.552,12,17,12z"></path>
				<linearGradient id="RGNWhQdzV6900AW9WSy0xf_IO7KMhAWvLJO_gr6" x1="20.293" x2="21.707" y1="12.293" y2="13.707" gradientUnits="userSpaceOnUse">
					<stop offset="0" stop-color="#fff" stop-opacity=".8"></stop>
					<stop offset=".519" stop-color="#fff" stop-opacity=".5"></stop>
					<stop offset="1" stop-color="#fff" stop-opacity=".6"></stop>
				</linearGradient>
				<circle cx="21" cy="13" r="1" fill="url(#RGNWhQdzV6900AW9WSy0xf_IO7KMhAWvLJO_gr6)"></circle>
				<linearGradient id="RGNWhQdzV6900AW9WSy0xg_IO7KMhAWvLJO_gr7" x1="11.793" x2="16.207" y1="15.793" y2="20.207" gradientUnits="userSpaceOnUse">
					<stop offset="0" stop-color="#fff" stop-opacity=".8"></stop>
					<stop offset=".519" stop-color="#fff" stop-opacity=".5"></stop>
					<stop offset="1" stop-color="#fff" stop-opacity=".6"></stop>
				</linearGradient>
				<path fill="url(#RGNWhQdzV6900AW9WSy0xg_IO7KMhAWvLJO_gr7)" d="M17,17c-0.186,0-5.814,0-6,0	c-0.552,0-1,0.448-1,1c0,0.552,0.448,1,1,1c0.186,0,5.814,0,6,0c0.552,0,1-0.448,1-1C18,17.448,17.552,17,17,17z"></path>
				<linearGradient id="RGNWhQdzV6900AW9WSy0xh_IO7KMhAWvLJO_gr8" x1="20.293" x2="21.707" y1="17.293" y2="18.707" gradientUnits="userSpaceOnUse">
					<stop offset="0" stop-color="#fff" stop-opacity=".8"></stop>
					<stop offset=".519" stop-color="#fff" stop-opacity=".5"></stop>
					<stop offset="1" stop-color="#fff" stop-opacity=".6"></stop>
				</linearGradient>
				<circle cx="21" cy="18" r="1" fill="url(#RGNWhQdzV6900AW9WSy0xh_IO7KMhAWvLJO_gr8)"></circle>
				<linearGradient id="RGNWhQdzV6900AW9WSy0xi_IO7KMhAWvLJO_gr9" x1="11.793" x2="16.207" y1="20.793" y2="25.207" gradientUnits="userSpaceOnUse">
					<stop offset="0" stop-color="#fff" stop-opacity=".8"></stop>
					<stop offset=".519" stop-color="#fff" stop-opacity=".5"></stop>
					<stop offset="1" stop-color="#fff" stop-opacity=".6"></stop>
				</linearGradient>
				<path fill="url(#RGNWhQdzV6900AW9WSy0xi_IO7KMhAWvLJO_gr9)" d="M17,22c-0.186,0-5.814,0-6,0	c-0.552,0-1,0.448-1,1c0,0.552,0.448,1,1,1c0.186,0,5.814,0,6,0c0.552,0,1-0.448,1-1C18,22.448,17.552,22,17,22z"></path>
				<linearGradient id="RGNWhQdzV6900AW9WSy0xj_IO7KMhAWvLJO_gr10" x1="20.293" x2="21.707" y1="22.293" y2="23.707" gradientUnits="userSpaceOnUse">
					<stop offset="0" stop-color="#fff" stop-opacity=".8"></stop>
					<stop offset=".519" stop-color="#fff" stop-opacity=".5"></stop>
					<stop offset="1" stop-color="#fff" stop-opacity=".6"></stop>
				</linearGradient>
				<circle cx="21" cy="23" r="1" fill="url(#RGNWhQdzV6900AW9WSy0xj_IO7KMhAWvLJO_gr10)"></circle>
			</svg>
			<span class="text-zinc-200 text-center">Правила</span>
		</div>
		<div data-fancybox data-src="#rules-pulse-ru" class="RU relative bg-zinc-900 rounded-2xl shadow p-3 lg:p-6 gap-3 flex flex-col items-center justify-center duration-300 hover:bg-zinc-800/70 cursor-pointer active:scale-95">
			<span class="text-sm p-1 bg-purple-500/50 rounded-2xl rounded-bl-none rounded-tr-none absolute top-0 left-0 text-default duration-300 shadow">Русский</span>
			<svg class="w-16 h-16 fill-purple-500 hidden" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
				<path d="M 12.5 4 C 10.032499 4 8 6.0324991 8 8.5 L 8 39.5 C 8 41.967501 10.032499 44 12.5 44 L 35.5 44 C 37.967501 44 40 41.967501 40 39.5 L 40 18.5 A 1.50015 1.50015 0 0 0 39.560547 17.439453 L 39.544922 17.423828 L 26.560547 4.4394531 A 1.50015 1.50015 0 0 0 25.5 4 L 12.5 4 z M 12.5 7 L 24 7 L 24 15.5 C 24 17.967501 26.032499 20 28.5 20 L 37 20 L 37 39.5 C 37 40.346499 36.346499 41 35.5 41 L 12.5 41 C 11.653501 41 11 40.346499 11 39.5 L 11 8.5 C 11 7.6535009 11.653501 7 12.5 7 z M 27 9.1210938 L 34.878906 17 L 28.5 17 C 27.653501 17 27 16.346499 27 15.5 L 27 9.1210938 z M 17.5 25 A 1.50015 1.50015 0 1 0 17.5 28 L 30.5 28 A 1.50015 1.50015 0 1 0 30.5 25 L 17.5 25 z M 17.5 32 A 1.50015 1.50015 0 1 0 17.5 35 L 26.5 35 A 1.50015 1.50015 0 1 0 26.5 32 L 17.5 32 z"></path>
			</svg>
			<svg xmlns="http://www.w3.org/2000/svg" class="w-16 h-16" viewBox="0 0 32 32">
				<linearGradient id="RGNWhQdzV6900AW9WSy0xa_IO7KMhAWvLJO_gr1" x1="4.892" x2="27.108" y1="5.284" y2="27.5" gradientUnits="userSpaceOnUse">
					<stop offset="0" stop-color="#00e9ff" stop-opacity=".95"></stop>
					<stop offset="1" stop-color="#00e9ff" stop-opacity=".5"></stop>
				</linearGradient>
				<path fill="url(#RGNWhQdzV6900AW9WSy0xa_IO7KMhAWvLJO_gr1)" d="M24,3.004H8c-1.105,0-2,0.895-2,2v23.333c0,0.523,0.583,0.836,1.019,0.545L9,27.561 l2.481,1.29c0.33,0.171,0.717,0.192,1.063,0.057L16,27.561l3.456,1.347c0.346,0.135,0.733,0.114,1.063-0.057L23,27.561 l1.981,1.321C25.417,29.172,26,28.86,26,28.337V5.004C26,3.899,25.105,3.004,24,3.004z"></path>
				<linearGradient id="RGNWhQdzV6900AW9WSy0xb_IO7KMhAWvLJO_gr2" x1="4.892" x2="27.108" y1="5.284" y2="27.5" gradientUnits="userSpaceOnUse">
					<stop offset="0" stop-color="#fff" stop-opacity=".6"></stop>
					<stop offset=".493" stop-color="#fff" stop-opacity="0"></stop>
					<stop offset=".997" stop-color="#fff" stop-opacity=".3"></stop>
				</linearGradient>
				<path fill="url(#RGNWhQdzV6900AW9WSy0xb_IO7KMhAWvLJO_gr2)" d="M24,3.504c0.827,0,1.5,0.673,1.5,1.5 v23.333c0,0.108-0.092,0.156-0.157,0.156c-0.029,0-0.057-0.009-0.084-0.027l-1.981-1.321l-0.246-0.164l-0.262,0.136l-2.482,1.29 c-0.112,0.058-0.238,0.089-0.364,0.089c-0.098,0-0.195-0.018-0.287-0.054l-3.456-1.347L16,27.025l-0.182,0.071l-3.456,1.347 c-0.092,0.036-0.188,0.054-0.287,0.054c-0.126,0-0.252-0.031-0.364-0.089l-2.482-1.29l-0.262-0.136l-0.246,0.164l-1.981,1.321 c-0.027,0.018-0.055,0.027-0.084,0.027c-0.065,0-0.157-0.049-0.157-0.156V5.004c0-0.827,0.673-1.5,1.5-1.5H24 M24,3.004H8 c-1.105,0-2,0.895-2,2v23.333c0,0.386,0.316,0.656,0.657,0.656c0.122,0,0.247-0.035,0.362-0.111L9,27.561l2.482,1.29 c0.186,0.097,0.39,0.145,0.595,0.145c0.158,0,0.317-0.029,0.468-0.088L16,27.561l3.456,1.347c0.151,0.059,0.31,0.088,0.468,0.088 c0.205,0,0.409-0.049,0.595-0.145L23,27.561l1.981,1.321c0.115,0.076,0.24,0.111,0.362,0.111c0.341,0,0.657-0.271,0.657-0.656 V5.004C26,3.899,25.105,3.004,24,3.004L24,3.004z"></path>
				<linearGradient id="RGNWhQdzV6900AW9WSy0xc_IO7KMhAWvLJO_gr3" x1="11.793" x2="16.207" y1="5.793" y2="10.207" gradientUnits="userSpaceOnUse">
					<stop offset="0" stop-color="#fff" stop-opacity=".8"></stop>
					<stop offset=".519" stop-color="#fff" stop-opacity=".5"></stop>
					<stop offset="1" stop-color="#fff" stop-opacity=".6"></stop>
				</linearGradient>
				<path fill="url(#RGNWhQdzV6900AW9WSy0xc_IO7KMhAWvLJO_gr3)" d="M17,7c-0.186,0-5.814,0-6,0	c-0.552,0-1,0.448-1,1c0,0.552,0.448,1,1,1c0.186,0,5.814,0,6,0c0.552,0,1-0.448,1-1C18,7.448,17.552,7,17,7z"></path>
				<linearGradient id="RGNWhQdzV6900AW9WSy0xd_IO7KMhAWvLJO_gr4" x1="20.293" x2="21.707" y1="7.293" y2="8.707" gradientUnits="userSpaceOnUse">
					<stop offset="0" stop-color="#fff" stop-opacity=".8"></stop>
					<stop offset=".519" stop-color="#fff" stop-opacity=".5"></stop>
					<stop offset="1" stop-color="#fff" stop-opacity=".6"></stop>
				</linearGradient>
				<circle cx="21" cy="8" r="1" fill="url(#RGNWhQdzV6900AW9WSy0xd_IO7KMhAWvLJO_gr4)"></circle>
				<linearGradient id="RGNWhQdzV6900AW9WSy0xe_IO7KMhAWvLJO_gr5" x1="11.793" x2="16.207" y1="10.793" y2="15.207" gradientUnits="userSpaceOnUse">
					<stop offset="0" stop-color="#fff" stop-opacity=".8"></stop>
					<stop offset=".519" stop-color="#fff" stop-opacity=".5"></stop>
					<stop offset="1" stop-color="#fff" stop-opacity=".6"></stop>
				</linearGradient>
				<path fill="url(#RGNWhQdzV6900AW9WSy0xe_IO7KMhAWvLJO_gr5)" d="M17,12c-0.186,0-5.814,0-6,0	c-0.552,0-1,0.448-1,1c0,0.552,0.448,1,1,1c0.186,0,5.814,0,6,0c0.552,0,1-0.448,1-1C18,12.448,17.552,12,17,12z"></path>
				<linearGradient id="RGNWhQdzV6900AW9WSy0xf_IO7KMhAWvLJO_gr6" x1="20.293" x2="21.707" y1="12.293" y2="13.707" gradientUnits="userSpaceOnUse">
					<stop offset="0" stop-color="#fff" stop-opacity=".8"></stop>
					<stop offset=".519" stop-color="#fff" stop-opacity=".5"></stop>
					<stop offset="1" stop-color="#fff" stop-opacity=".6"></stop>
				</linearGradient>
				<circle cx="21" cy="13" r="1" fill="url(#RGNWhQdzV6900AW9WSy0xf_IO7KMhAWvLJO_gr6)"></circle>
				<linearGradient id="RGNWhQdzV6900AW9WSy0xg_IO7KMhAWvLJO_gr7" x1="11.793" x2="16.207" y1="15.793" y2="20.207" gradientUnits="userSpaceOnUse">
					<stop offset="0" stop-color="#fff" stop-opacity=".8"></stop>
					<stop offset=".519" stop-color="#fff" stop-opacity=".5"></stop>
					<stop offset="1" stop-color="#fff" stop-opacity=".6"></stop>
				</linearGradient>
				<path fill="url(#RGNWhQdzV6900AW9WSy0xg_IO7KMhAWvLJO_gr7)" d="M17,17c-0.186,0-5.814,0-6,0	c-0.552,0-1,0.448-1,1c0,0.552,0.448,1,1,1c0.186,0,5.814,0,6,0c0.552,0,1-0.448,1-1C18,17.448,17.552,17,17,17z"></path>
				<linearGradient id="RGNWhQdzV6900AW9WSy0xh_IO7KMhAWvLJO_gr8" x1="20.293" x2="21.707" y1="17.293" y2="18.707" gradientUnits="userSpaceOnUse">
					<stop offset="0" stop-color="#fff" stop-opacity=".8"></stop>
					<stop offset=".519" stop-color="#fff" stop-opacity=".5"></stop>
					<stop offset="1" stop-color="#fff" stop-opacity=".6"></stop>
				</linearGradient>
				<circle cx="21" cy="18" r="1" fill="url(#RGNWhQdzV6900AW9WSy0xh_IO7KMhAWvLJO_gr8)"></circle>
				<linearGradient id="RGNWhQdzV6900AW9WSy0xi_IO7KMhAWvLJO_gr9" x1="11.793" x2="16.207" y1="20.793" y2="25.207" gradientUnits="userSpaceOnUse">
					<stop offset="0" stop-color="#fff" stop-opacity=".8"></stop>
					<stop offset=".519" stop-color="#fff" stop-opacity=".5"></stop>
					<stop offset="1" stop-color="#fff" stop-opacity=".6"></stop>
				</linearGradient>
				<path fill="url(#RGNWhQdzV6900AW9WSy0xi_IO7KMhAWvLJO_gr9)" d="M17,22c-0.186,0-5.814,0-6,0	c-0.552,0-1,0.448-1,1c0,0.552,0.448,1,1,1c0.186,0,5.814,0,6,0c0.552,0,1-0.448,1-1C18,22.448,17.552,22,17,22z"></path>
				<linearGradient id="RGNWhQdzV6900AW9WSy0xj_IO7KMhAWvLJO_gr10" x1="20.293" x2="21.707" y1="22.293" y2="23.707" gradientUnits="userSpaceOnUse">
					<stop offset="0" stop-color="#fff" stop-opacity=".8"></stop>
					<stop offset=".519" stop-color="#fff" stop-opacity=".5"></stop>
					<stop offset="1" stop-color="#fff" stop-opacity=".6"></stop>
				</linearGradient>
				<circle cx="21" cy="23" r="1" fill="url(#RGNWhQdzV6900AW9WSy0xj_IO7KMhAWvLJO_gr10)"></circle>
			</svg>
			<span class="text-zinc-200 text-center">Правила публикации на Pulse</span>
		</div>
		<div data-fancybox data-src="#rules-en" class="EN relative bg-zinc-900 rounded-2xl shadow p-3 lg:p-6 gap-3 flex flex-col items-center justify-center duration-300 hover:bg-zinc-800/70 cursor-pointer active:scale-95">
			<span class="text-sm p-1 bg-amber-500/50 rounded-2xl rounded-bl-none rounded-tr-none absolute top-0 left-0 text-default duration-300 shadow">English</span>
			<svg class="w-16 h-16 fill-purple-500 hidden" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
				<path d="M 12.5 4 C 10.032499 4 8 6.0324991 8 8.5 L 8 39.5 C 8 41.967501 10.032499 44 12.5 44 L 35.5 44 C 37.967501 44 40 41.967501 40 39.5 L 40 18.5 A 1.50015 1.50015 0 0 0 39.560547 17.439453 L 39.544922 17.423828 L 26.560547 4.4394531 A 1.50015 1.50015 0 0 0 25.5 4 L 12.5 4 z M 12.5 7 L 24 7 L 24 15.5 C 24 17.967501 26.032499 20 28.5 20 L 37 20 L 37 39.5 C 37 40.346499 36.346499 41 35.5 41 L 12.5 41 C 11.653501 41 11 40.346499 11 39.5 L 11 8.5 C 11 7.6535009 11.653501 7 12.5 7 z M 27 9.1210938 L 34.878906 17 L 28.5 17 C 27.653501 17 27 16.346499 27 15.5 L 27 9.1210938 z M 17.5 25 A 1.50015 1.50015 0 1 0 17.5 28 L 30.5 28 A 1.50015 1.50015 0 1 0 30.5 25 L 17.5 25 z M 17.5 32 A 1.50015 1.50015 0 1 0 17.5 35 L 26.5 35 A 1.50015 1.50015 0 1 0 26.5 32 L 17.5 32 z"></path>
			</svg>
			<svg xmlns="http://www.w3.org/2000/svg" class="w-16 h-16" viewBox="0 0 32 32">
				<linearGradient id="SRGNWhQdzV6900AW9WSy0xa_IO7KMhAWvLJO_gr1" x1="4.892" x2="27.108" y1="5.284" y2="27.5" gradientUnits="userSpaceOnUse">
					<stop offset="0" stop-color="#00e9ff" stop-opacity=".95"></stop>
					<stop offset="1" stop-color="#00e9ff" stop-opacity=".5"></stop>
				</linearGradient>
				<path fill="url(#SRGNWhQdzV6900AW9WSy0xa_IO7KMhAWvLJO_gr1)" d="M24,3.004H8c-1.105,0-2,0.895-2,2v23.333c0,0.523,0.583,0.836,1.019,0.545L9,27.561 l2.481,1.29c0.33,0.171,0.717,0.192,1.063,0.057L16,27.561l3.456,1.347c0.346,0.135,0.733,0.114,1.063-0.057L23,27.561 l1.981,1.321C25.417,29.172,26,28.86,26,28.337V5.004C26,3.899,25.105,3.004,24,3.004z"></path>
				<linearGradient id="SRGNWhQdzV6900AW9WSy0xb_IO7KMhAWvLJO_gr2" x1="4.892" x2="27.108" y1="5.284" y2="27.5" gradientUnits="userSpaceOnUse">
					<stop offset="0" stop-color="#fff" stop-opacity=".6"></stop>
					<stop offset=".493" stop-color="#fff" stop-opacity="0"></stop>
					<stop offset=".997" stop-color="#fff" stop-opacity=".3"></stop>
				</linearGradient>
				<path fill="url(#SRGNWhQdzV6900AW9WSy0xb_IO7KMhAWvLJO_gr2)" d="M24,3.504c0.827,0,1.5,0.673,1.5,1.5 v23.333c0,0.108-0.092,0.156-0.157,0.156c-0.029,0-0.057-0.009-0.084-0.027l-1.981-1.321l-0.246-0.164l-0.262,0.136l-2.482,1.29 c-0.112,0.058-0.238,0.089-0.364,0.089c-0.098,0-0.195-0.018-0.287-0.054l-3.456-1.347L16,27.025l-0.182,0.071l-3.456,1.347 c-0.092,0.036-0.188,0.054-0.287,0.054c-0.126,0-0.252-0.031-0.364-0.089l-2.482-1.29l-0.262-0.136l-0.246,0.164l-1.981,1.321 c-0.027,0.018-0.055,0.027-0.084,0.027c-0.065,0-0.157-0.049-0.157-0.156V5.004c0-0.827,0.673-1.5,1.5-1.5H24 M24,3.004H8 c-1.105,0-2,0.895-2,2v23.333c0,0.386,0.316,0.656,0.657,0.656c0.122,0,0.247-0.035,0.362-0.111L9,27.561l2.482,1.29 c0.186,0.097,0.39,0.145,0.595,0.145c0.158,0,0.317-0.029,0.468-0.088L16,27.561l3.456,1.347c0.151,0.059,0.31,0.088,0.468,0.088 c0.205,0,0.409-0.049,0.595-0.145L23,27.561l1.981,1.321c0.115,0.076,0.24,0.111,0.362,0.111c0.341,0,0.657-0.271,0.657-0.656 V5.004C26,3.899,25.105,3.004,24,3.004L24,3.004z"></path>
				<linearGradient id="SRGNWhQdzV6900AW9WSy0xc_IO7KMhAWvLJO_gr3" x1="11.793" x2="16.207" y1="5.793" y2="10.207" gradientUnits="userSpaceOnUse">
					<stop offset="0" stop-color="#fff" stop-opacity=".8"></stop>
					<stop offset=".519" stop-color="#fff" stop-opacity=".5"></stop>
					<stop offset="1" stop-color="#fff" stop-opacity=".6"></stop>
				</linearGradient>
				<path fill="url(#SRGNWhQdzV6900AW9WSy0xc_IO7KMhAWvLJO_gr3)" d="M17,7c-0.186,0-5.814,0-6,0  c-0.552,0-1,0.448-1,1c0,0.552,0.448,1,1,1c0.186,0,5.814,0,6,0c0.552,0,1-0.448,1-1C18,7.448,17.552,7,17,7z"></path>
				<linearGradient id="SRGNWhQdzV6900AW9WSy0xd_IO7KMhAWvLJO_gr4" x1="20.293" x2="21.707" y1="7.293" y2="8.707" gradientUnits="userSpaceOnUse">
					<stop offset="0" stop-color="#fff" stop-opacity=".8"></stop>
					<stop offset=".519" stop-color="#fff" stop-opacity=".5"></stop>
					<stop offset="1" stop-color="#fff" stop-opacity=".6"></stop>
				</linearGradient>
				<circle cx="21" cy="8" r="1" fill="url(#SRGNWhQdzV6900AW9WSy0xd_IO7KMhAWvLJO_gr4)"></circle>
				<linearGradient id="SRGNWhQdzV6900AW9WSy0xe_IO7KMhAWvLJO_gr5" x1="11.793" x2="16.207" y1="10.793" y2="15.207" gradientUnits="userSpaceOnUse">
					<stop offset="0" stop-color="#fff" stop-opacity=".8"></stop>
					<stop offset=".519" stop-color="#fff" stop-opacity=".5"></stop>
					<stop offset="1" stop-color="#fff" stop-opacity=".6"></stop>
				</linearGradient>
				<path fill="url(#SRGNWhQdzV6900AW9WSy0xe_IO7KMhAWvLJO_gr5)" d="M17,12c-0.186,0-5.814,0-6,0 c-0.552,0-1,0.448-1,1c0,0.552,0.448,1,1,1c0.186,0,5.814,0,6,0c0.552,0,1-0.448,1-1C18,12.448,17.552,12,17,12z"></path>
				<linearGradient id="SRGNWhQdzV6900AW9WSy0xf_IO7KMhAWvLJO_gr6" x1="20.293" x2="21.707" y1="12.293" y2="13.707" gradientUnits="userSpaceOnUse">
					<stop offset="0" stop-color="#fff" stop-opacity=".8"></stop>
					<stop offset=".519" stop-color="#fff" stop-opacity=".5"></stop>
					<stop offset="1" stop-color="#fff" stop-opacity=".6"></stop>
				</linearGradient>
				<circle cx="21" cy="13" r="1" fill="url(#SRGNWhQdzV6900AW9WSy0xf_IO7KMhAWvLJO_gr6)"></circle>
				<linearGradient id="SRGNWhQdzV6900AW9WSy0xg_IO7KMhAWvLJO_gr7" x1="11.793" x2="16.207" y1="15.793" y2="20.207" gradientUnits="userSpaceOnUse">
					<stop offset="0" stop-color="#fff" stop-opacity=".8"></stop>
					<stop offset=".519" stop-color="#fff" stop-opacity=".5"></stop>
					<stop offset="1" stop-color="#fff" stop-opacity=".6"></stop>
				</linearGradient>
				<path fill="url(#SRGNWhQdzV6900AW9WSy0xg_IO7KMhAWvLJO_gr7)" d="M17,17c-0.186,0-5.814,0-6,0 c-0.552,0-1,0.448-1,1c0,0.552,0.448,1,1,1c0.186,0,5.814,0,6,0c0.552,0,1-0.448,1-1C18,17.448,17.552,17,17,17z"></path>
				<linearGradient id="SRGNWhQdzV6900AW9WSy0xh_IO7KMhAWvLJO_gr8" x1="20.293" x2="21.707" y1="17.293" y2="18.707" gradientUnits="userSpaceOnUse">
					<stop offset="0" stop-color="#fff" stop-opacity=".8"></stop>
					<stop offset=".519" stop-color="#fff" stop-opacity=".5"></stop>
					<stop offset="1" stop-color="#fff" stop-opacity=".6"></stop>
				</linearGradient>
				<circle cx="21" cy="18" r="1" fill="url(#SRGNWhQdzV6900AW9WSy0xh_IO7KMhAWvLJO_gr8)"></circle>
				<linearGradient id="SRGNWhQdzV6900AW9WSy0xi_IO7KMhAWvLJO_gr9" x1="11.793" x2="16.207" y1="20.793" y2="25.207" gradientUnits="userSpaceOnUse">
					<stop offset="0" stop-color="#fff" stop-opacity=".8"></stop>
					<stop offset=".519" stop-color="#fff" stop-opacity=".5"></stop>
					<stop offset="1" stop-color="#fff" stop-opacity=".6"></stop>
				</linearGradient>
				<path fill="url(#SRGNWhQdzV6900AW9WSy0xi_IO7KMhAWvLJO_gr9)" d="M17,22c-0.186,0-5.814,0-6,0 c-0.552,0-1,0.448-1,1c0,0.552,0.448,1,1,1c0.186,0,5.814,0,6,0c0.552,0,1-0.448,1-1C18,22.448,17.552,22,17,22z"></path>
				<linearGradient id="SRGNWhQdzV6900AW9WSy0xj_IO7KMhAWvLJO_gr10" x1="20.293" x2="21.707" y1="22.293" y2="23.707" gradientUnits="userSpaceOnUse">
					<stop offset="0" stop-color="#fff" stop-opacity=".8"></stop>
					<stop offset=".519" stop-color="#fff" stop-opacity=".5"></stop>
					<stop offset="1" stop-color="#fff" stop-opacity=".6"></stop>
				</linearGradient>
				<circle cx="21" cy="23" r="1" fill="url(#SRGNWhQdzV6900AW9WSy0xj_IO7KMhAWvLJO_gr10)"></circle>
			</svg>
			<span class="text-zinc-200 text-center">Terms of Service</span>
		</div>
		<div data-fancybox data-src="#cookie" class="RU relative bg-zinc-900 rounded-2xl shadow p-3 lg:p-6 gap-3 flex flex-col items-center justify-center duration-300 hover:bg-zinc-800/70 cursor-pointer active:scale-95">
			<span class="text-sm p-1 bg-purple-500/50 rounded-2xl rounded-bl-none rounded-tr-none absolute top-0 left-0 text-default duration-300 shadow">Русский</span>
			<svg class="w-16 h-16 fill-purple-500 hidden" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
				<path d="M 12.5 4 C 10.032499 4 8 6.0324991 8 8.5 L 8 39.5 C 8 41.967501 10.032499 44 12.5 44 L 35.5 44 C 37.967501 44 40 41.967501 40 39.5 L 40 18.5 A 1.50015 1.50015 0 0 0 39.560547 17.439453 L 39.544922 17.423828 L 26.560547 4.4394531 A 1.50015 1.50015 0 0 0 25.5 4 L 12.5 4 z M 12.5 7 L 24 7 L 24 15.5 C 24 17.967501 26.032499 20 28.5 20 L 37 20 L 37 39.5 C 37 40.346499 36.346499 41 35.5 41 L 12.5 41 C 11.653501 41 11 40.346499 11 39.5 L 11 8.5 C 11 7.6535009 11.653501 7 12.5 7 z M 27 9.1210938 L 34.878906 17 L 28.5 17 C 27.653501 17 27 16.346499 27 15.5 L 27 9.1210938 z M 17.5 25 A 1.50015 1.50015 0 1 0 17.5 28 L 30.5 28 A 1.50015 1.50015 0 1 0 30.5 25 L 17.5 25 z M 17.5 32 A 1.50015 1.50015 0 1 0 17.5 35 L 26.5 35 A 1.50015 1.50015 0 1 0 26.5 32 L 17.5 32 z"></path>
			</svg>
			<svg xmlns="http://www.w3.org/2000/svg" class="w-16 h-16" viewBox="0,0,256,256">
				<defs>
					<linearGradient x1="16.09" y1="13.794" x2="29.568" y2="27.272" gradientUnits="userSpaceOnUse" id="color-1_Vq0a3AGLLhJ6_gr1">
						<stop offset="0" stop-color="#7259ff" stop-opacity="0.95"></stop>
						<stop offset="1" stop-color="#7259ff" stop-opacity="0.5"></stop>
					</linearGradient>
					<linearGradient x1="23.146" y1="26.146" x2="24.854" y2="27.854" gradientUnits="userSpaceOnUse" id="color-2_Vq0a3AGLLhJ6_gr2">
						<stop offset="0" stop-color="#ffffff" stop-opacity="0.8"></stop>
						<stop offset="0.519" stop-color="#ffffff" stop-opacity="0.5"></stop>
						<stop offset="1" stop-color="#ffffff" stop-opacity="0.6"></stop>
					</linearGradient>
					<linearGradient x1="23.146" y1="22.146" x2="24.854" y2="23.854" gradientUnits="userSpaceOnUse" id="color-3_Vq0a3AGLLhJ6_gr3">
						<stop offset="0" stop-color="#ffffff" stop-opacity="0.8"></stop>
						<stop offset="0.519" stop-color="#ffffff" stop-opacity="0.5"></stop>
						<stop offset="1" stop-color="#ffffff" stop-opacity="0.6"></stop>
					</linearGradient>
					<linearGradient x1="23.146" y1="18.146" x2="24.854" y2="19.854" gradientUnits="userSpaceOnUse" id="color-4_Vq0a3AGLLhJ6_gr4">
						<stop offset="0" stop-color="#ffffff" stop-opacity="0.8"></stop>
						<stop offset="0.519" stop-color="#ffffff" stop-opacity="0.5"></stop>
						<stop offset="1" stop-color="#ffffff" stop-opacity="0.6"></stop>
					</linearGradient>
					<linearGradient x1="23.146" y1="14.146" x2="24.854" y2="15.854" gradientUnits="userSpaceOnUse" id="color-5_Vq0a3AGLLhJ6_gr5">
						<stop offset="0" stop-color="#ffffff" stop-opacity="0.8"></stop>
						<stop offset="0.519" stop-color="#ffffff" stop-opacity="0.5"></stop>
						<stop offset="1" stop-color="#ffffff" stop-opacity="0.6"></stop>
					</linearGradient>
					<linearGradient x1="14.901" y1="16.802" x2="3.433" y2="28.271" gradientUnits="userSpaceOnUse" id="color-6_Vq0a3AGLLhJ6_gr6">
						<stop offset="0" stop-color="#7259ff" stop-opacity="0.95"></stop>
						<stop offset="1" stop-color="#7259ff" stop-opacity="0.5"></stop>
					</linearGradient>
					<linearGradient x1="8.854" y1="26.146" x2="7.146" y2="27.854" gradientUnits="userSpaceOnUse" id="color-7_Vq0a3AGLLhJ6_gr7">
						<stop offset="0" stop-color="#ffffff" stop-opacity="0.8"></stop>
						<stop offset="0.519" stop-color="#ffffff" stop-opacity="0.5"></stop>
						<stop offset="1" stop-color="#ffffff" stop-opacity="0.6"></stop>
					</linearGradient>
					<linearGradient x1="8.854" y1="22.146" x2="7.146" y2="23.854" gradientUnits="userSpaceOnUse" id="color-8_Vq0a3AGLLhJ6_gr8">
						<stop offset="0" stop-color="#ffffff" stop-opacity="0.8"></stop>
						<stop offset="0.519" stop-color="#ffffff" stop-opacity="0.5"></stop>
						<stop offset="1" stop-color="#ffffff" stop-opacity="0.6"></stop>
					</linearGradient>
					<linearGradient x1="8.854" y1="18.146" x2="7.146" y2="19.854" gradientUnits="userSpaceOnUse" id="color-9_Vq0a3AGLLhJ6_gr9">
						<stop offset="0" stop-color="#ffffff" stop-opacity="0.8"></stop>
						<stop offset="0.519" stop-color="#ffffff" stop-opacity="0.5"></stop>
						<stop offset="1" stop-color="#ffffff" stop-opacity="0.6"></stop>
					</linearGradient>
					<linearGradient x1="6.566" y1="7.859" x2="25.362" y2="26.655" gradientUnits="userSpaceOnUse" id="color-10_Vq0a3AGLLhJ6_gr10">
						<stop offset="0" stop-color="#2680ff" stop-opacity="0.95"></stop>
						<stop offset="1" stop-color="#2680ff" stop-opacity="0.5"></stop>
					</linearGradient>
					<linearGradient x1="13.146" y1="26.146" x2="14.854" y2="27.854" gradientUnits="userSpaceOnUse" id="color-11_Vq0a3AGLLhJ6_gr11">
						<stop offset="0" stop-color="#ffffff" stop-opacity="0.8"></stop>
						<stop offset="0.519" stop-color="#ffffff" stop-opacity="0.5"></stop>
						<stop offset="1" stop-color="#ffffff" stop-opacity="0.6"></stop>
					</linearGradient>
					<linearGradient x1="17.146" y1="26.146" x2="18.854" y2="27.854" gradientUnits="userSpaceOnUse" id="color-12_Vq0a3AGLLhJ6_gr12">
						<stop offset="0" stop-color="#ffffff" stop-opacity="0.8"></stop>
						<stop offset="0.519" stop-color="#ffffff" stop-opacity="0.5"></stop>
						<stop offset="1" stop-color="#ffffff" stop-opacity="0.6"></stop>
					</linearGradient>
					<linearGradient x1="13.146" y1="22.146" x2="14.854" y2="23.854" gradientUnits="userSpaceOnUse" id="color-13_Vq0a3AGLLhJ6_gr13">
						<stop offset="0" stop-color="#ffffff" stop-opacity="0.8"></stop>
						<stop offset="0.519" stop-color="#ffffff" stop-opacity="0.5"></stop>
						<stop offset="1" stop-color="#ffffff" stop-opacity="0.6"></stop>
					</linearGradient>
					<linearGradient x1="17.146" y1="22.146" x2="18.854" y2="23.854" gradientUnits="userSpaceOnUse" id="color-14_Vq0a3AGLLhJ6_gr14">
						<stop offset="0" stop-color="#ffffff" stop-opacity="0.8"></stop>
						<stop offset="0.519" stop-color="#ffffff" stop-opacity="0.5"></stop>
						<stop offset="1" stop-color="#ffffff" stop-opacity="0.6"></stop>
					</linearGradient>
					<linearGradient x1="13.146" y1="18.146" x2="14.854" y2="19.854" gradientUnits="userSpaceOnUse" id="color-15_Vq0a3AGLLhJ6_gr15">
						<stop offset="0" stop-color="#ffffff" stop-opacity="0.8"></stop>
						<stop offset="0.519" stop-color="#ffffff" stop-opacity="0.5"></stop>
						<stop offset="1" stop-color="#ffffff" stop-opacity="0.6"></stop>
					</linearGradient>
					<linearGradient x1="17.146" y1="18.146" x2="18.854" y2="19.854" gradientUnits="userSpaceOnUse" id="color-16_Vq0a3AGLLhJ6_gr16">
						<stop offset="0" stop-color="#ffffff" stop-opacity="0.8"></stop>
						<stop offset="0.519" stop-color="#ffffff" stop-opacity="0.5"></stop>
						<stop offset="1" stop-color="#ffffff" stop-opacity="0.6"></stop>
					</linearGradient>
					<linearGradient x1="13.146" y1="14.146" x2="14.854" y2="15.854" gradientUnits="userSpaceOnUse" id="color-17_Vq0a3AGLLhJ6_gr17">
						<stop offset="0" stop-color="#ffffff" stop-opacity="0.8"></stop>
						<stop offset="0.519" stop-color="#ffffff" stop-opacity="0.5"></stop>
						<stop offset="1" stop-color="#ffffff" stop-opacity="0.6"></stop>
					</linearGradient>
					<linearGradient x1="17.146" y1="14.146" x2="18.854" y2="15.854" gradientUnits="userSpaceOnUse" id="color-18_Vq0a3AGLLhJ6_gr18">
						<stop offset="0" stop-color="#ffffff" stop-opacity="0.8"></stop>
						<stop offset="0.519" stop-color="#ffffff" stop-opacity="0.5"></stop>
						<stop offset="1" stop-color="#ffffff" stop-opacity="0.6"></stop>
					</linearGradient>
					<linearGradient x1="13.146" y1="10.146" x2="14.854" y2="11.854" gradientUnits="userSpaceOnUse" id="color-19_Vq0a3AGLLhJ6_gr19">
						<stop offset="0" stop-color="#ffffff" stop-opacity="0.8"></stop>
						<stop offset="0.519" stop-color="#ffffff" stop-opacity="0.5"></stop>
						<stop offset="1" stop-color="#ffffff" stop-opacity="0.6"></stop>
					</linearGradient>
					<linearGradient x1="17.146" y1="10.146" x2="18.854" y2="11.854" gradientUnits="userSpaceOnUse" id="color-20_Vq0a3AGLLhJ6_gr20">
						<stop offset="0" stop-color="#ffffff" stop-opacity="0.8"></stop>
						<stop offset="0.519" stop-color="#ffffff" stop-opacity="0.5"></stop>
						<stop offset="1" stop-color="#ffffff" stop-opacity="0.6"></stop>
					</linearGradient>
					<linearGradient x1="13.146" y1="6.146" x2="14.854" y2="7.854" gradientUnits="userSpaceOnUse" id="color-21_Vq0a3AGLLhJ6_gr21">
						<stop offset="0" stop-color="#ffffff" stop-opacity="0.8"></stop>
						<stop offset="0.519" stop-color="#ffffff" stop-opacity="0.5"></stop>
						<stop offset="1" stop-color="#ffffff" stop-opacity="0.6"></stop>
					</linearGradient>
					<linearGradient x1="17.146" y1="6.146" x2="18.854" y2="7.854" gradientUnits="userSpaceOnUse" id="color-22_Vq0a3AGLLhJ6_gr22">
						<stop offset="0" stop-color="#ffffff" stop-opacity="0.8"></stop>
						<stop offset="0.519" stop-color="#ffffff" stop-opacity="0.5"></stop>
						<stop offset="1" stop-color="#ffffff" stop-opacity="0.6"></stop>
					</linearGradient>
					<linearGradient x1="5.439" y1="9.146" x2="26.561" y2="30.268" gradientUnits="userSpaceOnUse" id="color-23_Vq0a3AGLLhJ6_gr23">
						<stop offset="0" stop-color="#ffffff" stop-opacity="0.6"></stop>
						<stop offset="0.493" stop-color="#ffffff" stop-opacity="0"></stop>
						<stop offset="0.997" stop-color="#ffffff" stop-opacity="0.3"></stop>
					</linearGradient>
				</defs>
				<g fill-opacity="0" fill="#dddddd" fill-rule="nonzero" stroke="none" stroke-width="1" stroke-linecap="butt" stroke-linejoin="miter" stroke-miterlimit="10" stroke-dasharray="" stroke-dashoffset="0" font-family="none" font-weight="none" font-size="none" text-anchor="none" style="mix-blend-mode: normal">
					<path d="M0,256v-256h256v256z" id="bgRectangle"></path>
				</g>
				<g fill="none" fill-rule="nonzero" stroke="none" stroke-width="1" stroke-linecap="butt" stroke-linejoin="miter" stroke-miterlimit="10" stroke-dasharray="" stroke-dashoffset="0" font-family="none" font-weight="none" font-size="none" text-anchor="none" style="mix-blend-mode: normal">
					<g transform="scale(8,8)">
						<path d="M25,31h-4v-22l4.894,2.447c0.678,0.339 1.106,1.032 1.106,1.789v15.764c0,1.105 -0.895,2 -2,2z" fill="url(#color-1_Vq0a3AGLLhJ6_gr1)"></path>
						<path d="M24.5,28h-1c-0.276,0 -0.5,-0.224 -0.5,-0.5v-1c0,-0.276 0.224,-0.5 0.5,-0.5h1c0.276,0 0.5,0.224 0.5,0.5v1c0,0.276 -0.224,0.5 -0.5,0.5z" fill="url(#color-2_Vq0a3AGLLhJ6_gr2)"></path>
						<path d="M24.5,24h-1c-0.276,0 -0.5,-0.224 -0.5,-0.5v-1c0,-0.276 0.224,-0.5 0.5,-0.5h1c0.276,0 0.5,0.224 0.5,0.5v1c0,0.276 -0.224,0.5 -0.5,0.5z" fill="url(#color-3_Vq0a3AGLLhJ6_gr3)"></path>
						<path d="M24.5,20h-1c-0.276,0 -0.5,-0.224 -0.5,-0.5v-1c0,-0.276 0.224,-0.5 0.5,-0.5h1c0.276,0 0.5,0.224 0.5,0.5v1c0,0.276 -0.224,0.5 -0.5,0.5z" fill="url(#color-4_Vq0a3AGLLhJ6_gr4)"></path>
						<path d="M24.5,16h-1c-0.276,0 -0.5,-0.224 -0.5,-0.5v-1c0,-0.276 0.224,-0.5 0.5,-0.5h1c0.276,0 0.5,0.224 0.5,0.5v1c0,0.276 -0.224,0.5 -0.5,0.5z" fill="url(#color-5_Vq0a3AGLLhJ6_gr5)"></path>
						<path d="M7,31h4v-18l-4.894,2.447c-0.678,0.339 -1.106,1.032 -1.106,1.789v11.764c0,1.105 0.895,2 2,2z" fill="url(#color-6_Vq0a3AGLLhJ6_gr6)"></path>
						<path d="M7.5,28h1c0.276,0 0.5,-0.224 0.5,-0.5v-1c0,-0.276 -0.224,-0.5 -0.5,-0.5h-1c-0.276,0 -0.5,0.224 -0.5,0.5v1c0,0.276 0.224,0.5 0.5,0.5z" fill="url(#color-7_Vq0a3AGLLhJ6_gr7)"></path>
						<path d="M7.5,24h1c0.276,0 0.5,-0.224 0.5,-0.5v-1c0,-0.276 -0.224,-0.5 -0.5,-0.5h-1c-0.276,0 -0.5,0.224 -0.5,0.5v1c0,0.276 0.224,0.5 0.5,0.5z" fill="url(#color-8_Vq0a3AGLLhJ6_gr8)"></path>
						<path d="M7.5,20h1c0.276,0 0.5,-0.224 0.5,-0.5v-1c0,-0.276 -0.224,-0.5 -0.5,-0.5h-1c-0.276,0 -0.5,0.224 -0.5,0.5v1c0,0.276 0.224,0.5 0.5,0.5z" fill="url(#color-9_Vq0a3AGLLhJ6_gr9)"></path>
						<path d="M19,3v-1c0,-0.552 -0.448,-1 -1,-1h-4c-0.552,0 -1,0.448 -1,1v1h-1c-0.552,0 -1,0.448 -1,1v27h10v-27c0,-0.552 -0.448,-1 -1,-1z" fill="url(#color-10_Vq0a3AGLLhJ6_gr10)"></path>
						<path d="M14.5,28h-1c-0.276,0 -0.5,-0.224 -0.5,-0.5v-1c0,-0.276 0.224,-0.5 0.5,-0.5h1c0.276,0 0.5,0.224 0.5,0.5v1c0,0.276 -0.224,0.5 -0.5,0.5z" fill="url(#color-11_Vq0a3AGLLhJ6_gr11)"></path>
						<path d="M18.5,28h-1c-0.276,0 -0.5,-0.224 -0.5,-0.5v-1c0,-0.276 0.224,-0.5 0.5,-0.5h1c0.276,0 0.5,0.224 0.5,0.5v1c0,0.276 -0.224,0.5 -0.5,0.5z" fill="url(#color-12_Vq0a3AGLLhJ6_gr12)"></path>
						<path d="M14.5,24h-1c-0.276,0 -0.5,-0.224 -0.5,-0.5v-1c0,-0.276 0.224,-0.5 0.5,-0.5h1c0.276,0 0.5,0.224 0.5,0.5v1c0,0.276 -0.224,0.5 -0.5,0.5z" fill="url(#color-13_Vq0a3AGLLhJ6_gr13)"></path>
						<path d="M18.5,24h-1c-0.276,0 -0.5,-0.224 -0.5,-0.5v-1c0,-0.276 0.224,-0.5 0.5,-0.5h1c0.276,0 0.5,0.224 0.5,0.5v1c0,0.276 -0.224,0.5 -0.5,0.5z" fill="url(#color-14_Vq0a3AGLLhJ6_gr14)"></path>
						<path d="M14.5,20h-1c-0.276,0 -0.5,-0.224 -0.5,-0.5v-1c0,-0.276 0.224,-0.5 0.5,-0.5h1c0.276,0 0.5,0.224 0.5,0.5v1c0,0.276 -0.224,0.5 -0.5,0.5z" fill="url(#color-15_Vq0a3AGLLhJ6_gr15)"></path>
						<path d="M18.5,20h-1c-0.276,0 -0.5,-0.224 -0.5,-0.5v-1c0,-0.276 0.224,-0.5 0.5,-0.5h1c0.276,0 0.5,0.224 0.5,0.5v1c0,0.276 -0.224,0.5 -0.5,0.5z" fill="url(#color-16_Vq0a3AGLLhJ6_gr16)"></path>
						<path d="M14.5,16h-1c-0.276,0 -0.5,-0.224 -0.5,-0.5v-1c0,-0.276 0.224,-0.5 0.5,-0.5h1c0.276,0 0.5,0.224 0.5,0.5v1c0,0.276 -0.224,0.5 -0.5,0.5z" fill="url(#color-17_Vq0a3AGLLhJ6_gr17)"></path>
						<path d="M18.5,16h-1c-0.276,0 -0.5,-0.224 -0.5,-0.5v-1c0,-0.276 0.224,-0.5 0.5,-0.5h1c0.276,0 0.5,0.224 0.5,0.5v1c0,0.276 -0.224,0.5 -0.5,0.5z" fill="url(#color-18_Vq0a3AGLLhJ6_gr18)"></path>
						<path d="M14.5,12h-1c-0.276,0 -0.5,-0.224 -0.5,-0.5v-1c0,-0.276 0.224,-0.5 0.5,-0.5h1c0.276,0 0.5,0.224 0.5,0.5v1c0,0.276 -0.224,0.5 -0.5,0.5z" fill="url(#color-19_Vq0a3AGLLhJ6_gr19)"></path>
						<path d="M18.5,12h-1c-0.276,0 -0.5,-0.224 -0.5,-0.5v-1c0,-0.276 0.224,-0.5 0.5,-0.5h1c0.276,0 0.5,0.224 0.5,0.5v1c0,0.276 -0.224,0.5 -0.5,0.5z" fill="url(#color-20_Vq0a3AGLLhJ6_gr20)"></path>
						<path d="M14.5,8h-1c-0.276,0 -0.5,-0.224 -0.5,-0.5v-1c0,-0.276 0.224,-0.5 0.5,-0.5h1c0.276,0 0.5,0.224 0.5,0.5v1c0,0.276 -0.224,0.5 -0.5,0.5z" fill="url(#color-21_Vq0a3AGLLhJ6_gr21)"></path>
						<path d="M18.5,8h-1c-0.276,0 -0.5,-0.224 -0.5,-0.5v-1c0,-0.276 0.224,-0.5 0.5,-0.5h1c0.276,0 0.5,0.224 0.5,0.5v1c0,0.276 -0.224,0.5 -0.5,0.5z" fill="url(#color-22_Vq0a3AGLLhJ6_gr22)"></path>
						<path d="M18,1.5c0.276,0 0.5,0.224 0.5,0.5v1v0.5h0.5h1c0.276,0 0.5,0.224 0.5,0.5v5v0.309l0.276,0.138l4.894,2.447c0.511,0.256 0.829,0.77 0.829,1.342v15.764c0,0.827 -0.673,1.5 -1.5,1.5h-17.999c-0.827,0 -1.5,-0.673 -1.5,-1.5v-11.764c0,-0.572 0.318,-1.086 0.829,-1.342l4.894,-2.447l0.276,-0.138v-0.309v-9c0,-0.276 0.224,-0.5 0.5,-0.5h1h0.5v-0.5v-1c0,-0.276 0.224,-0.5 0.5,-0.5h4.001M18,1h-4c-0.552,0 -1,0.448 -1,1v1h-1c-0.552,0 -1,0.448 -1,1v9l-4.894,2.447c-0.678,0.339 -1.106,1.032 -1.106,1.789v11.764c0,1.105 0.895,2 2,2h18c1.105,0 2,-0.895 2,-2v-15.764c0,-0.758 -0.428,-1.45 -1.106,-1.789l-4.894,-2.447v-5c0,-0.552 -0.448,-1 -1,-1h-1v-1c0,-0.552 -0.448,-1 -1,-1z" fill="url(#color-23_Vq0a3AGLLhJ6_gr23)"></path>
					</g>
				</g>
			</svg>
			<span class="text-zinc-200 text-center">Политика использования файлов Cookie</span>
		</div>
	</div>
	<div class="lg:hidden"><br><br><br><br></div>
</div>
<div class="bg-zinc-900 text-zinc-100 rounded-2xl p-3" style="display: none;max-width:min(1000px, calc(100vw - 12px));" id="rules-pulse-ru">
	<div class="flex">
		<span class="font-medium text-left text-zinc-200 text-lg flex-grow">Правила Pulse</span>
		<svg data-fancybox-close class="inline duration-300  cursor-pointer w-5 h-5 fill-white inline" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
			<path d="M 39.486328 6.9785156 A 1.50015 1.50015 0 0 0 38.439453 7.4394531 L 24 21.878906 L 9.5605469 7.4394531 A 1.50015 1.50015 0 0 0 8.484375 6.984375 A 1.50015 1.50015 0 0 0 7.4394531 9.5605469 L 21.878906 24 L 7.4394531 38.439453 A 1.50015 1.50015 0 1 0 9.5605469 40.560547 L 24 26.121094 L 38.439453 40.560547 A 1.50015 1.50015 0 1 0 40.560547 38.439453 L 26.121094 24 L 40.560547 9.5605469 A 1.50015 1.50015 0 0 0 39.486328 6.9785156 z"></path>
		</svg>
	</div>
	<div class="container mx-auto py-12 prose prose-invert max-w-4xl">
		<!-- HEADER -->
		<header class="mb-12 text-center">
			<p class="text-zinc-400 text-lg">
				Актуально с 03.03.2026, версия 2.0 (Pulse)
			</p>
			<p class="mt-2">
				<a href="https://ancial.ru/legal" class="text-purple-400 hover:text-purple-300 underline">
				Официальная публикация
				</a>
			</p>
			<div class="mt-6 p-4 bg-zinc-900 rounded-2xl border border-zinc-800">
				<p class="text-sm">
					<strong>Контакт для обращений правообладателей и властей:</strong> 
					<a href="mailto:contact@ancial.ru?subject=[Копирайт]" class="text-purple-400 hover:text-purple-300">[Копирайт]</a> | 
					<a href="mailto:contact@ancial.ru?subject=[Пропаганда]" class="text-purple-400 hover:text-purple-300">[Пропаганда]</a>
					<br>
					<span class="text-red-400">❗ Блокируем в течение 24 часов по обоснованному требованию (ст. 15.1 149-ФЗ)</span>
				</p>
			</div>
		</header>
		<!-- NAVIGATION -->
		<nav class="mb-12 sticky top-4 bg-black/80 backdrop-blur-sm p-4 rounded-2xl border border-zinc-800">
			<h2 class="text-xl font-semibold text-purple-500 mb-3">Содержание</h2>
			<ul class="space-y-2 text-sm">
				<li>1. Общие положения (информационный посредник)</li>
				<li>2. Загрузка контента (ваши обязанности)</li>
				<li>3. Запрещённый контент</li>
				<li>4. Авторские права и жалобы</li>
				<li>5. Политические ограничения</li>
				<li>6. Модерация и санкции</li>
				<li>7. Контакты для властей</li>
				<li>Заключение</li>
			</ul>
		</nav>
		<!-- SECTION 1 -->
		<section id="section-1" class="mb-12 scroll-mt-20">
			<h2 class="text-2xl font-bold text-zinc-50 border-l-4 border-purple-500 pl-4 mb-4">1. Общие положения (информационный посредник)</h2>
			<ol class="list-decimal list-inside space-y-4">
				<li>
					<strong>Pulse — информационный посредник по ст. 15.1 Федерального закона № 149-ФЗ.</strong> 
					Платформа обеспечивает загрузку и прослушивание аудиофайлов исключительно пользователями. 
					Администрация не размещает контент самостоятельно, не модерирует его заранее и не несёт ответственности за правомерность материалов.
				</li>
				<li>
					Загружая контент, вы <strong>гарантируете</strong>:
					<ul class="list-disc ml-6 mt-2 space-y-1 text-amber-300">
						<li>Полные права на дистрибуцию (автор или разрешение правообладателя)</li>
						<li>Отсутствие нарушений российского законодательства</li>
						<li>Согласие на публичное прослушивание другими пользователями</li>
					</ul>
				</li>
				<li>
					После публикации трек/альбом <strong>не редактируется</strong> и удаляется только по требованию правообладателя, суда или Роскомнадзора.
				</li>
				<li>
					Используя Pulse, вы принимаете настоящие <a href="https://ancial.ru/legal" class="text-purple-400 hover:text-purple-300">Правила</a> и 
					<a href="https://ancial.ru/legal" class="text-purple-400 hover:text-purple-300">Политику конфиденциальности</a>.
				</li>
			</ol>
		</section>
		<!-- SECTION 2 -->
		<section id="section-2" class="mb-12 scroll-mt-20">
			<h2 class="text-2xl font-bold text-zinc-50 border-l-4 border-purple-500 pl-4 mb-4">2. Загрузка контента (ваши обязанности)</h2>
			<ol class="list-decimal list-inside space-y-4">
				<li>
					Вы обязаны загружать только <strong>легальный контент</strong>, соответствующий законодательству РФ.
				</li>
				<li>
					Форматы: MP3, WAV, FLAC (до 10 МБ на трек, до 10 треков в 1 альбоме). Технически повреждённые файлы блокируются автоматически.
				</li>
				<li>
					Метаданные (название, исполнитель, обложка) должны быть достоверными. Фейковые метаданные = блокировка.
				</li>
				<li>
					<strong>Вы несёте полную ответственность</strong> за нарушения. Блокировка аккаунта во всех сервисах Ancial без возврата токенов anci.
				</li>
			</ol>
		</section>
		<!-- SECTION 3 -->
		<section id="section-3" class="mb-12 scroll-mt-20">
			<h2 class="text-2xl font-bold text-zinc-50 border-l-4 border-red-500 pl-4 mb-4">3. Запрещённый контент</h2>
			<div class="bg-red-900/30 border border-red-800 p-6 rounded-2xl mb-6">
				<p class="text-red-200 font-semibold mb-4">❌ СТРОГО ЗАПРЕЩЕНО загружать:</p>
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-red-100">
					<ul class="list-disc ml-6 space-y-1">
						<li>Нарушение авторских прав (без письменного разрешения)</li>
						<li>Пропаганда/упоминания наркотиков <br> <span class="text-red-300">(даже негативные без маркировки "опасно и незаконно")</span></li>
						<li>Порнография, эротика, ЛГБТ-пропаганда <br> <span class="text-red-300">(«Деятельность „Международного общественного движения ЛГБТ“ запрещена в Российской Федерации»)</span></li>
						<li>Призывы к насилию, экстремизм, терроризм</li>
					</ul>
					<ul class="list-disc ml-6 space-y-1">
						<li>Оскорбления русской культуры, традиций, граждан РФ</li>
						<li>Фейковые новости, дезинформация</li>
						<li>Спам, мошенничество, вредоносный код</li>
						<li>Контент 18+ без возрастной маркировки</li>
					</ul>
				</div>
			</div>
		</section>
		<!-- SECTION 4 -->
		<section id="section-4" class="mb-12 scroll-mt-20">
			<h2 class="text-2xl font-bold text-zinc-50 border-l-4 border-purple-500 pl-4 mb-4">4. Авторские права и жалобы</h2>
			<ol class="list-decimal list-inside space-y-4">
				<li>
					Правообладатели направляют уведомления на 
					<a href="mailto:contact@ancial.ru?subject=[Копирайт]" class="text-purple-400">[Копирайт]</a>:
					<ul class="list-disc ml-6 mt-2 space-y-1 text-sm">
						<li>Контакты заявителя</li>
						<li>Ссылка на трек</li>
						<li>Доказательства прав</li>
						<li>Электронная подпись</li>
					</ul>
				</li>
				<li>
					<strong>Блокировка в 24 часа</strong> с момента получения. Логи жалоб хранятся 3 года.
				</li>
				<li>
					Контр-уведомление: <a href="mailto:contact@ancial.ru?subject=[Апелляция]" class="text-purple-400">[Апелляция]</a>.
				</li>
				<li>
					3 жалобы = бессрочная блокировка.
				</li>
			</ol>
		</section>
		<!-- SECTION 5 -->
		<section id="section-5" class="mb-12 scroll-mt-20">
			<h2 class="text-2xl font-bold text-zinc-50 border-l-4 border-red-500 pl-4 mb-4">5. Политические ограничения</h2>
			<div class="bg-red-900/30 border border-red-800 p-6 rounded-2xl mb-6">
				<p class="text-red-300 font-semibold mb-4">🚫 Запрещено публиковать материалы:</p>
				<ul class="list-disc ml-6 space-y-2 text-red-100">
					<li>Исполнителей, публично оскорбляющих русскую культуру, традиции, граждан РФ</li>
					<li>Поддерживающих/донатящих ВСУ или другие запрещённые/террористические структуры</li>
					<li>С призывами к дискриминации по национальному признаку</li>
					<li>Пропагандирующих "русофобию" или дискредитирующих ВС РФ</li>
				</ul>
				<p class="text-sm text-red-400 mt-4">
					<strong>Такие треки блокируются немедленно по жалобе.</strong> Список "нежелательных" исполнителей ведётся Администрацией.
				</p>
			</div>
		</section>
		<!-- SECTION 6 -->
		<section id="section-6" class="mb-12 scroll-mt-20">
			<h2 class="text-2xl font-bold text-zinc-50 border-l-4 border-purple-500 pl-4 mb-4">6. Модерация и санкции</h2>
			<ol class="list-decimal list-inside space-y-4">
				<li>
					<strong>Автоматическая модерация:</strong> ключевые слова (может применяться в будущем, сейчас не действует).
				</li>
				<li>
					<strong>Ручная:</strong> по жалобам пользователей и требованиям РКН.
				</li>
				<li>
					Санкции:
					<ul class="list-disc ml-6 mt-2 space-y-1">
						<li>1 нарушение = удаление трека + предупреждение</li>
						<li>2 = временная блокировка (7 дней)</li>
						<li>3+ = бессрочная блокировка всех сервисов Ancial</li>
					</ul>
				</li>
				<li>
					Апелляция: <a href="mailto:contact@ancial.ru?subject=[Апелляция]" class="text-purple-400">[Апелляция]</a> (5 дней).
				</li>
			</ol>
		</section>
		<section id="section-8" class="mb-12 scroll-mt-20">
			<h2 class="text-2xl font-bold text-zinc-50 border-l-4 border-red-500 pl-4 mb-4">7. Запрещённые исполнители в Pulse</h2>
			<p class="mb-4">
				Этот список генерируется автоматически на базе искуственного интеллекта с доступом к актуальной информации и соцсетям, может быть неполным или устаревшим, содержать неточности.<br>
				Если вы считаете, что какой-то исполнитель ошибочно попал в этот список, пожалуйста, свяжитесь с нами через 
				<a href="mailto:contact@ancial.ru?subject=[Запрещённый исполнитель]" class="text-purple-400">contact@ancial.ru</a>
				с указанием имени исполнителя и причины, по которой вы считаете его ошибочно включённым.<br> 
				Мы рассмотрим ваше обращение и при необходимости внесём изменения.
			</p>
			<div class="overflow-auto w-full h-full relative rounded-2xl border border-red-800">
				<table class="w-full text-sm text-zinc-300 border-collapse">
					<thead>
						<tr class="bg-gradient-to-r from-red-900/50 to-red-800/50 border-b border-red-600/50">
							<th class="p-3 text-left font-semibold text-red-200 border-r border-red-500/30">Исполнитель</th>
							<th class="p-3 text-left font-semibold text-red-200 border-r border-red-500/30">Причина</th>
							<th class="p-3 text-left font-semibold text-red-200 w-48">Статус</th>
						</tr>
					</thead>
					<tbody>
						<!-- Российские -->
						<tr class="border-b border-zinc-700/50 hover:bg-zinc-800/50 transition-all duration-200">
							<td class="p-3 font-medium text-zinc-200 border-r border-zinc-600/50">Земфира (Рамазанова)</td>
							<td class="p-3 text-amber-300 border-r border-zinc-600/50">Сборы для ВСУ, иноагент Минюста РФ</td>
							<td class="p-3"><span class="bg-red-900/50 text-red-200 px-2 py-1 rounded-full text-xs font-bold">Публикация запрещена</span></td>
						</tr>
						<tr class="border-b border-zinc-700/50 hover:bg-zinc-800/50 transition-all duration-200">
							<td class="p-3 font-medium text-zinc-200 border-r border-zinc-600/50">Рената Литвинова</td>
							<td class="p-3 text-amber-300 border-r border-zinc-600/50">Сборы для ВСУ</td>
							<td class="p-3"><span class="bg-red-900/50 text-red-200 px-2 py-1 rounded-full text-xs font-bold">Публикация запрещена</span></td>
						</tr>
						<tr class="border-b border-zinc-700/50 hover:bg-zinc-800/50 transition-all duration-200">
							<td class="p-3 font-medium text-zinc-200 border-r border-zinc-600/50">Артём Смольянинов</td>
							<td class="p-3 text-amber-300 border-r border-zinc-600/50">Сборы для ВСУ</td>
							<td class="p-3"><span class="bg-red-900/50 text-red-200 px-2 py-1 rounded-full text-xs font-bold">Публикация запрещена</span></td>
						</tr>
						<tr class="border-b border-zinc-700/50 hover:bg-zinc-800/50 transition-all duration-200">
							<td class="p-3 font-medium text-zinc-200 border-r border-zinc-600/50">Юрий Шевчук (ДДТ)</td>
							<td class="p-3 text-amber-300 border-r border-zinc-600/50">Сборы для ВСУ</td>
							<td class="p-3"><span class="bg-red-900/50 text-red-200 px-2 py-1 rounded-full text-xs font-bold">Публикация запрещена</span></td>
						</tr>
						<tr class="border-b border-zinc-700/50 hover:bg-zinc-800/50 transition-all duration-200">
							<td class="p-3 font-medium text-zinc-200 border-r border-zinc-600/50">Максим Покровский ("Ногу свело!")</td>
							<td class="p-3 text-amber-300 border-r border-zinc-600/50">Сборы для ВСУ</td>
							<td class="p-3"><span class="bg-red-900/50 text-red-200 px-2 py-1 rounded-full text-xs font-bold">Публикация запрещена</span></td>
						</tr>
						<tr class="border-b border-zinc-700/50 hover:bg-zinc-800/50 transition-all duration-200">
							<td class="p-3 font-medium text-zinc-200 border-r border-zinc-600/50">Татьяна Лазарева</td>
							<td class="p-3 text-amber-300 border-r border-zinc-600/50">Сборы для ВСУ</td>
							<td class="p-3"><span class="bg-red-900/50 text-red-200 px-2 py-1 rounded-full text-xs font-bold">Публикация запрещена</span></td>
						</tr>
						<tr class="border-b border-zinc-700/50 hover:bg-zinc-800/50 transition-all duration-200">
							<td class="p-3 font-medium text-zinc-200 border-r border-zinc-600/50">Алексей Кортнев</td>
							<td class="p-3 text-amber-300 border-r border-zinc-600/50">Публичная поддержка Украины против РФ</td>
							<td class="p-3"><span class="bg-red-900/50 text-red-200 px-2 py-1 rounded-full text-xs font-bold">Публикация запрещена</span></td>
						</tr>
						<tr class="border-b border-zinc-700/50 hover:bg-zinc-800/50 transition-all duration-200">
							<td class="p-3 font-medium text-zinc-200 border-r border-zinc-600/50">Моргенштерн</td>
							<td class="p-3 text-amber-300 border-r border-zinc-600/50">Иноагент Минюста РФ</td>
							<td class="p-3"><span class="bg-red-900/50 text-red-200 px-2 py-1 rounded-full text-xs font-bold">Публикация запрещена</span></td>
						</tr>
						<tr class="border-b border-zinc-700/50 hover:bg-zinc-800/50 transition-all duration-200">
							<td class="p-3 font-medium text-zinc-200 border-r border-zinc-600/50">Oxxxymiron</td>
							<td class="p-3 text-amber-300 border-r border-zinc-600/50">"Антивоенные"/Проукраинские концерты, поддержка Украины, иноагент Минюста РФ</td>
							<td class="p-3"><span class="bg-red-900/50 text-red-200 px-2 py-1 rounded-full text-xs font-bold">Публикация запрещена</span></td>
						</tr>
						<tr class="border-b border-zinc-700/50 hover:bg-zinc-800/50 transition-all duration-200">
							<td class="p-3 font-medium text-zinc-200 border-r border-zinc-600/50">Монеточка / NoizeMC</td>
							<td class="p-3 text-amber-300 border-r border-zinc-600/50">"Антивоенные"/Проукраинские концерты, поддержка Украины, иноагент Минюста РФ</td>
							<td class="p-3"><span class="bg-red-900/50 text-red-200 px-2 py-1 rounded-full text-xs font-bold">Публикация запрещена</span></td>
						</tr>
						<!-- Украинские -->
						<tr class="border-b border-zinc-700/50 hover:bg-zinc-800/50 transition-all duration-200">
							<td class="p-3 font-medium text-zinc-200 border-r border-zinc-600/50">Андрей Хлывнюк ("Бумбокс")</td>
							<td class="p-3 text-amber-300 border-r border-zinc-600/50">Служит в ВСУ, оператор БПЛА</td>
							<td class="p-3"><span class="bg-red-900/50 text-red-200 px-2 py-1 rounded-full text-xs font-bold">Публикация запрещена</span></td>
						</tr>
						<tr class="border-b border-zinc-700/50 hover:bg-zinc-800/50 transition-all duration-200">
							<td class="p-3 font-medium text-zinc-200 border-r border-zinc-600/50">Макс Барских</td>
							<td class="p-3 text-amber-300 border-r border-zinc-600/50">Вступил в ВСУ, запретил музыку в РФ</td>
							<td class="p-3"><span class="bg-red-900/50 text-red-200 px-2 py-1 rounded-full text-xs font-bold">Публикация запрещена</span></td>
						</tr>
						<tr class="hover:bg-zinc-800/50 transition-all duration-200">
							<td class="p-3 font-medium text-zinc-200 border-r border-zinc-600/50">Потап</td>
							<td class="p-3 text-amber-300 border-r border-zinc-600/50">Донаты ВСУ</td>
							<td class="p-3"><span class="bg-red-900/50 text-red-200 px-2 py-1 rounded-full text-xs font-bold">Публикация запрещена</span></td>
						</tr>
					</tbody>
				</table>
			</div>
		</section>
		<!-- SECTION 7 -->
		<section id="section-7" class="mb-12 scroll-mt-20">
			<h2 class="text-2xl font-bold text-zinc-50 border-l-4 border-amber-500 pl-4 mb-4">8. Контакты для властей и пользователей</h2>
			<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
				<div class="bg-amber-900/30 border border-amber-800 p-4 rounded-2xl">
					<h3 class="font-semibold text-amber-300 mb-2">[Копирайт]</h3>
					<a href="mailto:contact@ancial.ru?subject=[Копирайт]" class="text-amber-200">[Копирайт]</a>
					<p class="text-amber-400 text-sm mt-1">Авторские права, DMCA</p>
				</div>
				<div class="bg-amber-900/30 border border-amber-800 p-4 rounded-2xl">
					<h3 class="font-semibold text-amber-300 mb-2">[Пропаганда]</h3>
					<a href="mailto:contact@ancial.ru?subject=[Пропаганда]" class="text-amber-200">[Пропаганда]</a>
					<p class="text-amber-400 text-sm mt-1">Наркотики, экстремизм, политика</p>
				</div>
				<div class="bg-amber-900/30 border border-amber-800 p-4 rounded-2xl">
					<h3 class="font-semibold text-amber-300 mb-2">[Жалоба]</h3>
					<a href="mailto:contact@ancial.ru?subject=[Жалоба]" class="text-amber-200">[Жалоба]</a>
					<p class="text-amber-400 text-sm mt-1">Общие нарушения</p>
				</div>
				<div class="bg-amber-900/30 border border-amber-800 p-4 rounded-2xl">
					<h3 class="font-semibold text-amber-300 mb-2">[Апелляция]</h3>
					<a href="mailto:contact@ancial.ru?subject=[Апелляция]" class="text-amber-200">[Апелляция]</a>
					<p class="text-amber-400 text-sm mt-1">Оспорить блокировку</p>
				</div>
			</div>
		</section>
		<div class="mt-8 p-6 bg-zinc-900 rounded-2xl border border-zinc-700">
			<p class="text-sm">
				Полная версия правил: 
				<a href="https://ancial.ru/legal" class="text-purple-400 hover:text-purple-300 underline font-medium">ancial.ru/legal</a>
			</p>
		</div>
		</section>
		<!-- FOOTER -->
		<footer class="text-center py-8 text-zinc-500 text-sm border-t border-zinc-800 mt-12">
			<p>© 2026 Ancial Pulse. Все права защищены. Версия 2.0</p>
		</footer>
	</div>
</div>
<div class="bg-zinc-900 text-zinc-100 rounded-2xl p-3" style="display: none;max-width:1000px;" id="rules-ru">
	<div class="flex">
		<span class="font-medium text-left text-zinc-200 text-lg flex-grow">Правила</span>
		<svg data-fancybox-close class="inline duration-300  cursor-pointer w-5 h-5 fill-white inline" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
			<path d="M 39.486328 6.9785156 A 1.50015 1.50015 0 0 0 38.439453 7.4394531 L 24 21.878906 L 9.5605469 7.4394531 A 1.50015 1.50015 0 0 0 8.484375 6.984375 A 1.50015 1.50015 0 0 0 7.4394531 9.5605469 L 21.878906 24 L 7.4394531 38.439453 A 1.50015 1.50015 0 1 0 9.5605469 40.560547 L 24 26.121094 L 38.439453 40.560547 A 1.50015 1.50015 0 1 0 40.560547 38.439453 L 26.121094 24 L 40.560547 9.5605469 A 1.50015 1.50015 0 0 0 39.486328 6.9785156 z"></path>
		</svg>
	</div>
	<div class="container mx-auto py-12 prose prose-invert max-w-4xl">
		<!-- HEADER -->
		<header class="mb-12 text-center">
			<p class="text-zinc-400 text-lg">
				Актуально с 22.09.2025, версия 1.3
			</p>
			<p class="mt-2">
				<a href="https://ancial.ru/legal" class="text-purple-400 hover:text-purple-300 underline">
				Официальная публикация
				</a>
			</p>
			<div class="mt-6 p-4 bg-zinc-900 rounded-2xl border border-zinc-800">
				<p class="text-sm">
					<strong>Контакт для обращений:</strong> 
					<a href="mailto:contact@ancial.ru" class="text-purple-400 hover:text-purple-300">contact@ancial.ru</a>
					<br>
					<span class="text-red-400">❗ Обязательно указывайте тему письма в формате <code class="email-tag">[ТЕМА]</code></span>
				</p>
			</div>
		</header>
		<!-- NAVIGATION -->
		<nav class="mb-12 sticky top-4 bg-black/80 backdrop-blur-sm p-4 rounded-2xl border border-zinc-800">
			<h2 class="text-xl font-semibold text-purple-500 mb-3">Содержание</h2>
			<ul class="space-y-2 text-sm">
				<li>1. Общие положения</li>
				<li>2. Регистрация и аккаунт</li>
				<li>3. Лента (посты)</li>
				<li>4. Чаты (личные и групповые сообщения)</li>
				<li>5. Музыка (Pulse)</li>
				<li>6. Видео (ClickPlay/Stream)</li>
				<li>7. Кошелёк (Wallet) и токены anci</li>
				<li>8. Авторские права и жалобы</li>
				<li>9. Запрещённое поведение и санкции</li>
				<li>10. Конфиденциальность и данные</li>
				<li>11. Модерация и апелляции</li>
				<li>12. Изменения правил и юридические аспекты</li>
				<li>13. Сообщества и группы</li>
				<li>Заключение</li>
			</ul>
		</nav>
		<!-- SECTION 1 -->
		<section id="section-1" class="mb-12 scroll-mt-20">
			<h2 class="text-2xl font-bold text-zinc-50 border-l-4 border-purple-500 pl-4 mb-4">1. Общие положения</h2>
			<ol class="list-decimal list-inside space-y-4">
				<li>
					Настоящие Правила регулируют отношения между Пользователями и Администрацией платформы Ancial (зарегистрированной в Российской Федерации), предоставляющей доступ к сервисам: Лента (посты с медиа), Чаты (личные и групповые сообщения), Pulse (музыкальный раздел), ClickPlay/Stream (видеоагрегатор), Wallet (кошелёк с токенами anci), Сообщества и группы (раздел 13).
				</li>
				<li>
					Используя любой из сервисов Ancial, Пользователь безоговорочно принимает настоящие Правила, Политику конфиденциальности и иные официальные документы платформы.
				</li>
				<li>
					Администрация оставляет за собой право в одностороннем порядке изменять Правила. Изменения публикуются на https://ancial.ru/legal и вступают в силу через 7 (семь) календарных дней. Продолжение использования платформы после вступления изменений в силу означает их принятие.
				</li>
				<li>
					Платформа функционирует в соответствии с законодательством Российской Федерации, а также учитывает международные стандарты (включая GDPR для пользователей ЕС). В случае противоречий — приоритет имеют законы РФ.
				</li>
				<li>
					Минимальный возраст для регистрации и использования платформы — 14 лет.
					<br>
					❗ Платформа может содержать контент, предназначенный для пользователей старше 18 лет. Пользователи младше 18 лет обязаны использовать платформу под контролем родителей или законных представителей.
				</li>
			</ol>
		</section>
		<!-- SECTION 2 -->
		<section id="section-2" class="mb-12 scroll-mt-20">
			<h2 class="text-2xl font-bold text-zinc-50 border-l-4 border-purple-500 pl-4 mb-4">2. Регистрация и аккаунт</h2>
			<ol class="list-decimal list-inside space-y-4">
				<li>
					Для регистрации требуется указать: действующий email и/или номер телефона; придумать уникальный логин; установить надёжный пароль.
				</li>
				<li>
					Для подтверждения email и/или номера телефона, а также для удобного входа на платформу, Пользователь может привязать аккаунт Telegram или Yandex.
					<br>
					Привязка позволяет:
					<ul class="list-disc ml-6 mt-2 space-y-1">
						<li>подтвердить контактные данные (email/телефон);</li>
						<li>авторизовываться на платформе через Telegram или Yandex без ввода логина/пароля.</li>
					</ul>
				</li>
				<li>
					Пользователь обязан:
					<ul class="list-disc ml-6 mt-2 space-y-1">
						<li>предоставлять достоверную информацию;</li>
						<li>не регистрировать несколько аккаунтов без согласования с Администрацией;</li>
						<li>не передавать доступ к аккаунту третьим лицам;</li>
						<li>немедленно уведомлять contact@ancial.ru (с темой [Безопасность]) о взломе или несанкционированном доступе.</li>
					</ul>
				</li>
				<li>
					Администрация вправе:
					<ul class="list-disc ml-6 mt-2 space-y-1">
						<li>отказать в регистрации без объяснения причин;</li>
						<li>заблокировать или удалить аккаунт при нарушении Правил;</li>
						<li>потребовать верификацию личности (например, подтверждение email/телефона) при подозрении на мошенничество, спам или нарушения.</li>
					</ul>
				</li>
				<li>
					При удалении аккаунта по запросу пользователя (письмо на contact@ancial.ru с темой [Удаление аккаунта]):
					<ul class="list-disc ml-6 mt-2 space-y-1">
						<li>все данные (посты, сообщения, медиа, подписки) удаляются безвозвратно;</li>
						<li>токены anci аннулируются и не подлежат восстановлению или выводу;</li>
						<li>процесс удаления занимает до 30 дней.</li>
					</ul>
				</li>
				<li>
					Двухфакторная аутентификация на платформе отсутствует. Рекомендуется использовать привязку Telegram или Yandex для повышения безопасности и удобства входа.
				</li>
			</ol>
		</section>
		<!-- SECTION 3 -->
		<section id="section-3" class="mb-12 scroll-mt-20">
			<h2 class="text-2xl font-bold text-zinc-50 border-l-4 border-purple-500 pl-4 mb-4">3. Лента (посты)</h2>
			<ol class="list-decimal list-inside space-y-4">
				<li>
					Пользователь может публиковать посты от своего имени или от имени Сообщества, где он имеет статус Создателя или Редактора.
				</li>
				<li>
					Запрещено публиковать в Ленте:
					<div class="bg-red-900/30 border border-red-800 p-4 rounded-2xl mt-3 mb-3">
						<ul class="list-disc ml-6 space-y-1 text-red-100">
							<li>Порнографический, эротический или сексуально откровенный контент;</li>
							<li>Контент, изображающий насилие, жестокость, причинение вреда людям или животным;</li>
							<li>Оскорбления, угрозы, доксинг (публикация личных данных без согласия), клевета;</li>
							<li>Призывы к насилию, экстремизму, терроризму, разжиганию ненависти по любым признакам;</li>
							<li>Спам, флуд, накрутка, бот-активность;</li>
							<li>Фейковые новости, дезинформация, способная причинить вред (например, в сфере здоровья, безопасности);</li>
							<li>Контент, нарушающий авторские права (см. раздел 8);</li>
							<li>Пропаганду наркотиков, самоубийств, опасных практик.</li>
						</ul>
					</div>
				</li>
				<li>
					Контент может содержать обсуждение любых тем (политика, религия, общество и т.д.), если это делается без оскорблений, угроз и разжигания вражды.
				</li>
				<li>
					Администрация не модерирует Ленту превентивно, но реагирует на жалобы пользователей и удаляет нарушающий контент. Пользователь, опубликовавший запрещённый материал, может быть заблокирован без предупреждения.
				</li>
			</ol>
		</section>
		<!-- SECTION 4 -->
		<section id="section-4" class="mb-12 scroll-mt-20">
			<h2 class="text-2xl font-bold text-zinc-50 border-l-4 border-purple-500 pl-4 mb-4">4. Чаты (личные и групповые сообщения)</h2>
			<ol class="list-decimal list-inside space-y-4">
				<li>
					Чаты предназначены для личного общения между пользователями. Администрация не модерирует чаты в реальном времени и не хранит переписки, за исключением случаев расследования жалоб или запросов правоохранительных органов.
				</li>
				<li>
					Запрещено в чатах:
					<div class="bg-red-900/30 border border-red-800 p-4 rounded-2xl mt-3 mb-3">
						<ul class="list-disc ml-6 space-y-1 text-red-100">
							<li>Отправка спама, флуда, цепочек, мошеннических ссылок;</li>
							<li>Оскорбления, угрозы, доксинг, сексуальные домогательства;</li>
							<li>Рассылка порнографии, насилия, запрещённого контента;</li>
							<li>Использование чатов для координации нарушений Правил (например, рейдов, троллинга).</li>
						</ul>
					</div>
				</li>
				<li>
					При получении жалобы на сообщение в чате — Администрация может запросить логи переписки (если технически доступны) для проверки. При подтверждении нарушения — отправитель блокируется.
				</li>
				<li>
					Пользователи несут полную ответственность за содержание своих сообщений. Администрация не обязана уведомлять о модерации чатов.
				</li>
			</ol>
		</section>
		<!-- SECTION 5 -->
		<section id="section-5" class="mb-12 scroll-mt-20">
			<h2 class="text-2xl font-bold text-zinc-50 border-l-4 border-purple-500 pl-4 mb-4">5. Музыка (Pulse)</h2>
			<ol class="list-decimal list-inside space-y-4">
				<li>
					Pulse — раздел для загрузки и прослушивания аудиотреков и альбомов. Загрузка доступна зарегистрированным пользователям.
				</li>
				<li>
					Пользователь, загружающий трек, несёт полную ответственность за соблюдение авторских прав. Администрация не проверяет контент до публикации.
				</li>
				<li>
					Запрещено загружать в Pulse:
					<div class="bg-red-900/30 border border-red-800 p-4 rounded-2xl mt-3 mb-3">
						<ul class="list-disc ml-6 space-y-1 text-red-100">
							<li>Треки, нарушающие авторские права (без разрешения правообладателя);</li>
							<li>Аудио с порнографическим, насильственным или экстремистским содержанием;</li>
							<li>Аудио, содержащие прямые оскорбления, призывы к насилию;</li>
							<li>Технически неисправные или вредоносные файлы.</li>
						</ul>
					</div>
				</li>
				<li>
					Разрешены:
					<ul class="list-disc ml-6 mt-2 space-y-1">
						<li>Оригинальные композиции;</li>
						<li>Каверы, ремиксы, фан-версии — только при наличии разрешения правообладателя или в рамках добросовестного использования (fair use), если это допускается законодательством страны пользователя.</li>
					</ul>
				</li>
				<li>
					При поступлении жалобы от правообладателя (на contact@ancial.ru с темой [Авторские права]) — трек удаляется в течение 72 часов, пользователь получает уведомление. Повторные нарушения ведут к блокировке аккаунта.
				</li>
			</ol>
		</section>
		<!-- SECTION 6 -->
		<section id="section-6" class="mb-12 scroll-mt-20">
			<h2 class="text-2xl font-bold text-zinc-50 border-l-4 border-purple-500 pl-4 mb-4">6. Видео (ClickPlay/Stream)</h2>
			<ol class="list-decimal list-inside space-y-4">
				<li>
					ClickPlay/Stream — агрегатор видео, позволяющий добавлять ссылки на видео из YouTube, RuTube, VK Video и других публичных платформ. Загрузка файлов напрямую не предусмотрена.
				</li>
				<li>
					Пользователь, добавляющий видео, подтверждает, что:
					<ul class="list-disc ml-6 mt-2 space-y-1">
						<li>видео является публичным и разрешено к встраиванию;</li>
						<li>он не нарушает авторские права;</li>
						<li>контент не содержит запрещённого материала.</li>
					</ul>
				</li>
				<li>
					Запрещено добавлять видео, содержащие:
					<div class="bg-red-900/30 border border-red-800 p-4 rounded-2xl mt-3 mb-3">
						<ul class="list-disc ml-6 space-y-1 text-red-100">
							<li>Порнографию, насилие, жестокость;</li>
							<li>Экстремизм, терроризм, призывы к незаконной деятельности;</li>
							<li>Оскорбления, доксинг, клевету;</li>
							<li>Нарушение авторских прав (без разрешения).</li>
						</ul>
					</div>
				</li>
				<li>
					Если видео на исходной платформе (например, YouTube) удалено или заблокировано — оно становится недоступным и на Ancial.
				</li>
				<li>
					При жалобе правообладателя (на contact@ancial.ru с темой [Авторские права]) — ссылка на видео удаляется в течение 72 часов. Пользователь предупреждается. Повторные нарушения — блокировка.
				</li>
			</ol>
		</section>
		<!-- SECTION 7 -->
		<section id="section-7" class="mb-12 scroll-mt-20">
			<h2 class="text-2xl font-bold text-zinc-50 border-l-4 border-purple-500 pl-4 mb-4">7. Кошелёк (Wallet) и токены anci</h2>
			<ol class="list-decimal list-inside space-y-4">
				<li>
					anci — внутренние виртуальные токены платформы, привязанные к криптовалюте anci в сети TON. Токены не являются деньгами или финансовым инструментом, а предназначены для поощрения активности и взаимодействия внутри платформы.
				</li>
				<li>
					Получение токенов:
					<ul class="list-disc ml-6 mt-2 space-y-1">
						<li>Только через добровольные пожертвования от других пользователей (например, за понравившийся пост, музыку, видео);</li>
						<li>Не продаются за реальные деньги;</li>
						<li>Не начисляются автоматически за регистрацию или активность.</li>
					</ul>
				</li>
				<li>
					Использование токенов:
					<ul class="list-disc ml-6 mt-2 space-y-1">
						<li>Перевод другим пользователям;</li>
						<li>Обмен на внутренние поощрения (например: бейджи, стикеры, премиум-функции — если предусмотрены);</li>
						<li>Вывод на внешний TON-кошелёк (при наличии верифицированного аккаунта и соблюдении лимитов).</li>
					</ul>
				</li>
				<li>
					Вывод токенов:
					<ul class="list-disc ml-6 mt-2 space-y-1">
						<li>Возможен только на TON-кошельки;</li>
						<li>Считается «поощерением», а не продажей или переводом денежных средств;</li>
						<li>Не облагается налогами со стороны платформы — пользователь самостоятельно несёт ответственность перед своим государством при выводе.</li>
					</ul>
				</li>
				<li>
					Запрещено:
					<div class="bg-red-900/30 border border-red-800 p-4 rounded-2xl mt-3 mb-3">
						<ul class="list-disc ml-6 space-y-1 text-red-100">
							<li>Использование токенов для покупки запрещённого контента или услуг;</li>
							<li>Мошенничество, накрутка, спам ради получения токенов;</li>
							<li>Переводы, имитирующие продажу товаров/услуг (платформа не является маркетплейсом).</li>
						</ul>
					</div>
				</li>
				<li>
					При блокировке аккаунта — все токены аннулируются. При удалении — не возвращаются.
				</li>
				<li>
					Администрация вправе заморозить кошелёк при подозрении на мошенничество, отмывание, спам или нарушение Правил. Для разморозки — письмо на contact@ancial.ru с темой [Кошелёк].
				</li>
			</ol>
		</section>
		<!-- SECTION 8 -->
		<section id="section-8" class="mb-12 scroll-mt-20">
			<h2 class="text-2xl font-bold text-zinc-50 border-l-4 border-purple-500 pl-4 mb-4">8. Авторские права и жалобы</h2>
			<ol class="list-decimal list-inside space-y-4">
				<li>
					Пользователь гарантирует, что загружаемый им контент (посты, музыка, видео, изображения) не нарушает авторских, смежных, патентных или иных прав третьих лиц.
				</li>
				<li>
					При обнаружении нарушения — правообладатель может отправить жалобу на contact@ancial.ru с темой [Авторские права] и указанием:
					<ul class="list-disc ml-6 mt-2 space-y-1">
						<li>Своих контактных данных;</li>
						<li>Описания нарушенного произведения;</li>
						<li>Ссылки на контент на Ancial;</li>
						<li>Заявления о добросовестности претензии;</li>
						<li>Подписи (электронной или скан-копии).</li>
					</ul>
				</li>
				<li>
					Администрация обязуется рассмотреть жалобу в течение 72 часов и удалить контент при подтверждении нарушения.
				</li>
				<li>
					Пользователь, чей контент удалён, получает уведомление и может направить контр-уведомление (если считает удаление ошибочным) на contact@ancial.ru с темой [Апелляция — Авторские права].
				</li>
				<li>
					Повторные нарушения авторских прав ведут к бессрочной блокировке аккаунта.
				</li>
			</ol>
		</section>
		<!-- SECTION 9 -->
		<section id="section-9" class="mb-12 scroll-mt-20">
			<h2 class="text-2xl font-bold text-zinc-50 border-l-4 border-purple-500 pl-4 mb-4">9. Запрещённое поведение и санкции</h2>
			<ol class="list-decimal list-inside space-y-4">
				<li>
					Запрещено:
					<div class="bg-red-900/30 border border-red-800 p-4 rounded-2xl mt-3 mb-3">
						<ul class="list-disc ml-6 space-y-1 text-red-100">
							<li>Создание аккаунтов с целью обхода блокировок;</li>
							<li>Использование ботов, скриптов, автоматизации без согласия Администрации;</li>
							<li>Фишинг, мошенничество, сбор данных пользователей;</li>
							<li>Продажа аккаунтов, токенов, мест в сообществах;</li>
							<li>Имитация администрации или других пользователей (поддельные аккаунты);</li>
							<li>Координация массовых атак, рейдов, троллинга.</li>
						</ul>
					</div>
				</li>
				<li>
					Санкции:
					<ul class="list-disc ml-6 mt-2 space-y-1">
						<li>Предупреждение (редко, только в исключительных случаях);</li>
						<li>Блокировка аккаунта (временная или бессрочная) — основная мера;</li>
						<li>Удаление контента;</li>
						<li>Аннулирование токенов;</li>
						<li>Передача данных в правоохранительные органы — при нарушении закона.</li>
					</ul>
				</li>
				<li>
					Блокировка выдаётся немедленно без предварительного предупреждения, за исключением случаев, когда Администрация сочтёт возможным запросить пояснения — письмо на contact@ancial.ru с темой [Пояснение].
				</li>
			</ol>
		</section>
		<!-- SECTION 10 -->
		<section id="section-10" class="mb-12 scroll-mt-20">
			<h2 class="text-2xl font-bold text-zinc-50 border-l-4 border-purple-500 pl-4 mb-4">10. Конфиденциальность и данные</h2>
			<ol class="list-decimal list-inside space-y-4">
				<li>
					Администрация собирает и обрабатывает:
					<ul class="list-disc ml-6 mt-2 space-y-1">
						<li>Email, телефон, логин, страну проживания;</li>
						<li>IP-адрес при регистрации и входе;</li>
						<li>Данные поведения (просмотры, лайки, переходы) — для улучшения рекомендаций;</li>
						<li>Файлы (фото, видео, аудио), загруженные пользователем;</li>
						<li>Переписки — только при расследовании жалоб.</li>
					</ul>
				</li>
				<li>
					Данные не продаются третьим лицам. Используются для:
					<ul class="list-disc ml-6 mt-2 space-y-1">
						<li>Работы платформы;</li>
						<li>Модерации;</li>
						<li>Рассылок (можно отключить);</li>
						<li>Статистики и улучшения сервиса.</li>
					</ul>
				</li>
				<li>
					Пользователь вправе:
					<ul class="list-disc ml-6 mt-2 space-y-1">
						<li>Запросить копию своих данных (contact@ancial.ru с темой [Мои данные]);</li>
						<li>Удалить аккаунт и данные — см. пункт 2.5.</li>
					</ul>
				</li>
				<li>
					Платформа использует cookies и аналогичные технологии. Продолжая использовать сайт — пользователь соглашается с этим.
				</li>
			</ol>
		</section>
		<!-- SECTION 11 -->
		<section id="section-11" class="mb-12 scroll-mt-20">
			<h2 class="text-2xl font-bold text-zinc-50 border-l-4 border-purple-500 pl-4 mb-4">11. Модерация и апелляции</h2>
			<ol class="list-decimal list-inside space-y-4">
				<li>
					Модераторы — сотрудники Администрации. В отдельных случаях могут привлекаться обученные волонтёры под контролем команды.
				</li>
				<li>
					Жалобы на контент подаются через кнопку «Пожаловаться» под материалом или на contact@ancial.ru с темой [Жалоба на контент].
				</li>
				<li>
					Решения модераторов окончательны, за исключением случаев, когда пользователь может запросить пересмотр, отправив письмо на contact@ancial.ru с темой [Апелляция] и приложением доказательств.
				</li>
				<li>
					Апелляция рассматривается в течение 5 рабочих дней. Отказ в восстановлении аккаунта — финальное решение.
				</li>
				<li>
					Статистика модерации не публикуется регулярно, но может быть раскрыта в годовых отчётах.
				</li>
			</ol>
		</section>
		<!-- SECTION 12 -->
		<section id="section-12" class="mb-12 scroll-mt-20">
			<h2 class="text-2xl font-bold text-zinc-50 border-l-4 border-purple-500 pl-4 mb-4">12. Изменения правил и юридические аспекты</h2>
			<ol class="list-decimal list-inside space-y-4">
				<li>
					Платформа не несёт ответственности за:
					<ul class="list-disc ml-6 mt-2 space-y-1">
						<li>Убытки, вызванные использованием или невозможностью использования сервисов;</li>
						<li>Действия третьих лиц (включая пользователей);</li>
						<li>Содержание внешних ссылок и видео (YouTube и др.).</li>
					</ul>
				</li>
				<li>
					Все споры разрешаются в соответствии с законодательством Российской Федерации.
				</li>
				<li>
					В случае признания какого-либо положения Правил недействительным — остальные положения сохраняют силу.
				</li>
				<li>
					Форс-мажор: Администрация не отвечает за сбои, вызванные обстоятельствами непреодолимой силы (войны, стихийные бедствия, действия властей, хакерские атаки).
				</li>
				<li>
					Официальная переписка с Администрацией ведётся только через contact@ancial.ru с обязательным указанием темы письма в формате [ТЕМА]. Письма без темы могут быть проигнорированы или обработаны с задержкой.
				</li>
			</ol>
		</section>
		<!-- SECTION 13 -->
		<section id="section-13" class="mb-12 scroll-mt-20">
			<h2 class="text-2xl font-bold text-zinc-50 border-l-4 border-purple-500 pl-4 mb-4">13. Сообщества и группы</h2>
			<ol class="list-decimal list-inside space-y-4">
				<li>
					Сообщества — публичные или частные страницы, созданные пользователями для объединения аудитории по интересам, темам, проектам.
				</li>
				<li>
					Создатель Сообщества — пользователь, инициировавший его создание. Назначает Редакторов (модераторов) по своему усмотрению.
				</li>
				<li>
					Права Создателя и Редакторов:
					<ul class="list-disc ml-6 mt-2 space-y-1">
						<li>Публикация постов от имени Сообщества;</li>
						<li>Управление участниками (приглашение, удаление, назначение ролей);</li>
						<li>Настройка приватности (публичное/частное);</li>
						<li>Установка правил внутри Сообщества (дополнительных к настоящим Правилам).</li>
					</ul>
				</li>
				<li>
					Запрещено в Сообществах:
					<div class="bg-red-900/30 border border-red-800 p-4 rounded-2xl mt-3 mb-3">
						<ul class="list-disc ml-6 space-y-1 text-red-100">
							<li>Публикация контента, запрещённого разделами 3, 5, 6;</li>
							<li>Создание Сообществ с названиями, имитирующими официальные органы, бренды, администрацию без разрешения;</li>
							<li>Использование Сообществ для спама, мошенничества, сбора данных;</li>
							<li>Продажа управления Сообществом или мест в нём за реальные деньги или токены (если не разрешено Администрацией).</li>
						</ul>
					</div>
				</li>
				<li>
					Ответственность за контент в Сообществе несёт Создатель и Редакторы, опубликовавшие материал. При нарушении — удаляется контент, предупреждается или блокируется аккаунт ответственного лица.
				</li>
				<li>
					Администрация вправе удалить Сообщество без предупреждения при грубом или повторном нарушении Правил.
				</li>
				<li>
					Пользователи могут жаловаться на контент или действия модераторов Сообщества через кнопку «Пожаловаться» или на contact@ancial.ru с темой [Жалоба на сообщество].
				</li>
				<li>
					Администрация не обязана модерировать Сообщества превентивно, но реагирует на жалобы.
				</li>
			</ol>
		</section>
		<!-- CONCLUSION -->
		<section id="conclusion" class="mb-16 scroll-mt-20 pt-8 border-t border-zinc-800">
			<h2 class="text-3xl font-bold text-zinc-50 mb-6">Заключение</h2>
			<p class="mb-6">
				Настоящие Правила являются публичной офертой и вступают в силу с момента начала использования Платформы Ancial.
				<br>
				Полная версия всегда доступна по адресу:
				<a href="https://ancial.ru/legal" class="text-purple-400 hover:text-purple-300 underline font-medium">https://ancial.ru/legal</a>
			</p>
			<div class="bg-zinc-900 p-6 rounded-2xl border border-purple-800/50">
				<h3 class="text-xl font-semibold text-purple-400 mb-3">❗ ВАЖНО</h3>
				<p>
					При отправке любого письма на <strong>contact@ancial.ru</strong> обязательно указывайте тему в формате <code class="email-tag">[ТЕМА]</code>, например:
				</p>
				<div class="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
					<code class="email-tag">[Жалоба на контент]</code>
					<code class="email-tag">[Авторские права]</code>
					<code class="email-tag">[Апелляция]</code>
					<code class="email-tag">[Удаление аккаунта]</code>
					<code class="email-tag">[Мои данные]</code>
					<code class="email-tag">[Кошелёк]</code>
					<code class="email-tag">[Безопасность]</code>
					<code class="email-tag">[Пояснение]</code>
					<code class="email-tag">[Жалоба на сообщество]</code>
				</div>
				<p class="mt-4 text-sm text-red-400">
					Письма без темы могут быть проигнорированы или обработаны с задержкой.
				</p>
			</div>
		</section>
		<!-- FOOTER -->
		<footer class="text-center py-8 text-zinc-500 text-sm border-t border-zinc-800 mt-12">
			<p>© 2025 Ancial. Все права защищены.</p>
			<p class="mt-2">
				Версия правил: 1.3 | Опубликовано: <a href="https://ancial.ru/legal" class="text-purple-400 hover:underline">ancial.ru/legal</a>
			</p>
		</footer>
	</div>
	<style>
		.prose {
		max-width: 75ch;
		line-height: 1.75;
		}
		.email-tag {
		@apply bg-zinc-900 text-purple-300 px-2 py-1 rounded-2xlfont-mono text-sm;
		}
		html {
		scroll-behavior: smooth;
		}
	</style>
</div>
<div class="bg-zinc-900 text-zinc-100 rounded-2xl p-3" style="display: none;max-width:1000px;" id="rules-en">
	<div class="flex">
		<span class="font-medium text-left text-zinc-200 text-lg flex-grow">Terms of Service</span>
		<svg data-fancybox-close class="inline duration-300  cursor-pointer w-5 h-5 fill-white inline" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
			<path d="M 39.486328 6.9785156 A 1.50015 1.50015 0 0 0 38.439453 7.4394531 L 24 21.878906 L 9.5605469 7.4394531 A 1.50015 1.50015 0 0 0 8.484375 6.984375 A 1.50015 1.50015 0 0 0 7.4394531 9.5605469 L 21.878906 24 L 7.4394531 38.439453 A 1.50015 1.50015 0 1 0 9.5605469 40.560547 L 24 26.121094 L 38.439453 40.560547 A 1.50015 1.50015 0 1 0 40.560547 38.439453 L 26.121094 24 L 40.560547 9.5605469 A 1.50015 1.50015 0 0 0 39.486328 6.9785156 z"></path>
		</svg>
	</div>
	<div class="container mx-auto py-12 prose prose-invert max-w-4xl">
		<!-- HEADER -->
		<header class="mb-12 text-center">
			<p class="text-zinc-400 text-lg">
				Effective from September 22, 2025, version 1.3
			</p>
			<p class="mt-2">
				<a href="https://ancial.ru/legal" class="text-purple-400 hover:text-purple-300 underline">
				Official Publication
				</a>
			</p>
			<div class="mt-6 p-4 bg-zinc-900 rounded-2xl border border-zinc-800">
				<p class="text-sm">
					<strong>Contact for inquiries:</strong> 
					<a href="mailto:contact@ancial.ru" class="text-purple-400 hover:text-purple-300">contact@ancial.ru</a>
					<br>
					<span class="text-red-400">❗ Always specify the subject of the email in the format <code class="email-tag">[SUBJECT]</code></span>
				</p>
			</div>
		</header>
		<!-- NAVIGATION -->
		<nav class="mb-12 sticky top-4 bg-black/80 backdrop-blur-sm p-4 rounded-2xl border border-zinc-800">
			<h2 class="text-xl font-semibold text-purple-500 mb-3">Table of Contents</h2>
			<ul class="space-y-2 text-sm">
				<li>1. General Provisions</li>
				<li>2. Registration and Account</li>
				<li>3. Feed (Posts)</li>
				<li>4. Chats (Private and Group Messages)</li>
				<li>5. Music (Pulse)</li>
				<li>6. Videos (ClickPlay/Stream)</li>
				<li>7. Wallet and anci Tokens</li>
				<li>8. Copyright and Complaints</li>
				<li>9. Prohibited Behavior and Sanctions</li>
				<li>10. Privacy and Data</li>
				<li>11. Moderation and Appeals</li>
				<li>12. Changes to Terms and Legal Aspects</li>
				<li>13. Communities and Groups</li>
				<li>Conclusion</li>
			</ul>
		</nav>
		<!-- SECTION 1 -->
		<section id="section-1" class="mb-12 scroll-mt-20">
			<h2 class="text-2xl font-bold text-zinc-50 border-l-4 border-purple-500 pl-4 mb-4">1. General Provisions</h2>
			<ol class="list-decimal list-inside space-y-4">
				<li>
					These Terms regulate the relationship between Users and the Administration of the Ancial platform (registered in the Russian Federation), which provides access to the following services: Feed (posts with media), Chats (private and group messages), Pulse (music section), ClickPlay/Stream (video aggregator), Wallet (with anci tokens), Communities and Groups (section 13).
				</li>
				<li>
					By using any of the Ancial services, the User unconditionally accepts these Terms, Privacy Policy, and other official platform documents.
				</li>
				<li>
					The Administration reserves the right to unilaterally change the Terms. Changes are published at https://ancial.ru/legal and take effect after 7 (seven) calendar days. Continued use of the platform after the changes take effect means acceptance of them.
				</li>
				<li>
					The platform operates in accordance with the laws of the Russian Federation and also takes into account international standards (including GDPR for EU users). In case of contradictions, Russian laws take priority.
				</li>
				<li>
					The minimum age for registration and use of the platform is 14 years.
					<br>
					❗ The platform may contain content intended for users over 18 years of age. Users under 18 years of age must use the platform under the supervision of parents or legal guardians.
				</li>
			</ol>
		</section>
		<!-- SECTION 2 -->
		<section id="section-2" class="mb-12 scroll-mt-20">
			<h2 class="text-2xl font-bold text-zinc-50 border-l-4 border-purple-500 pl-4 mb-4">2. Registration and Account</h2>
			<ol class="list-decimal list-inside space-y-4">
				<li>
					Registration requires: a valid email and/or phone number; a unique username; a secure password.
				</li>
				<li>
					To verify email and/or phone number, as well as for convenient login to the platform, the User can link their Telegram or Yandex account.
					<br>
					Linking allows you to:
					<ul class="list-disc ml-6 mt-2 space-y-1">
						<li>verify contact information (email/phone);</li>
						<li>log in to the platform via Telegram or Yandex without entering a username/password.</li>
					</ul>
				</li>
				<li>
					The User is obliged to:
					<ul class="list-disc ml-6 mt-2 space-y-1">
						<li>provide accurate information;</li>
						<li>not register multiple accounts without the Administration's consent;</li>
						<li>not transfer access to the account to third parties;</li>
						<li>immediately notify contact@ancial.ru (with the subject [Security]) of any hacking or unauthorized access.</li>
					</ul>
				</li>
				<li>
					The Administration has the right to:
					<ul class="list-disc ml-6 mt-2 space-y-1">
						<li>refuse registration without explanation;</li>
						<li>block or delete an account in case of violation of the Terms;</li>
						<li>require identity verification (for example, email/phone confirmation) in case of suspected fraud, spam, or violations.</li>
					</ul>
				</li>
				<li>
					When deleting an account at the user's request (email to contact@ancial.ru with the subject [Account Deletion]):
					<ul class="list-disc ml-6 mt-2 space-y-1">
						<li>all data (posts, messages, media, subscriptions) are permanently deleted;</li>
						<li>anci tokens are forfeited and are not subject to recovery or withdrawal;</li>
						<li>the deletion process takes up to 30 days.</li>
					</ul>
				</li>
				<li>
					Two-factor authentication is not available on the platform. It is recommended to use Telegram or Yandex linking to enhance security and login convenience.
				</li>
			</ol>
		</section>
		<!-- SECTION 3 -->
		<section id="section-3" class="mb-12 scroll-mt-20">
			<h2 class="text-2xl font-bold text-zinc-50 border-l-4 border-purple-500 pl-4 mb-4">3. Feed (Posts)</h2>
			<ol class="list-decimal list-inside space-y-4">
				<li>
					A User can publish posts on their own behalf or on behalf of a Community where they have Creator or Editor status.
				</li>
				<li>
					It is prohibited to publish in the Feed:
					<div class="bg-red-900/30 border border-red-800 p-4 rounded-2xl mt-3 mb-3">
						<ul class="list-disc ml-6 space-y-1 text-red-100">
							<li>Pornographic, erotic, or sexually explicit content;</li>
							<li>Content depicting violence, cruelty, harm to people or animals;</li>
							<li>Insults, threats, doxxing (publishing personal data without consent), defamation;</li>
							<li>Calls for violence, extremism, terrorism, inciting hatred based on any grounds;</li>
							<li>Spam, flooding, artificial engagement, bot activity;</li>
							<li>Fake news, misinformation that can cause harm (for example, in health, safety);</li>
							<li>Content that violates copyright (see section 8);</li>
							<li>Promotion of drugs, suicide, dangerous practices.</li>
						</ul>
					</div>
				</li>
				<li>
					Content may contain discussions of any topics (politics, religion, society, etc.) if done without insults, threats, and inciting hostility.
				</li>
				<li>
					The Administration does not moderate the Feed proactively but responds to user complaints and removes violating content. A User who has published prohibited material may be blocked without warning.
				</li>
			</ol>
		</section>
		<!-- SECTION 4 -->
		<section id="section-4" class="mb-12 scroll-mt-20">
			<h2 class="text-2xl font-bold text-zinc-50 border-l-4 border-purple-500 pl-4 mb-4">4. Chats (Private and Group Messages)</h2>
			<ol class="list-decimal list-inside space-y-4">
				<li>
					Chats are intended for personal communication between users. The Administration does not moderate chats in real-time and does not store correspondence, except in cases of investigating complaints or requests from law enforcement agencies.
				</li>
				<li>
					Prohibited in chats:
					<div class="bg-red-900/30 border border-red-800 p-4 rounded-2xl mt-3 mb-3">
						<ul class="list-disc ml-6 space-y-1 text-red-100">
							<li>Sending spam, flooding, chain messages, fraudulent links;</li>
							<li>Insults, threats, doxxing, sexual harassment;</li>
							<li>Distributing pornography, violence, prohibited content;</li>
							<li>Using chats to coordinate violations of the Terms (for example, raids, trolling).</li>
						</ul>
					</div>
				</li>
				<li>
					Upon receiving a complaint about a message in a chat, the Administration may request correspondence logs (if technically available) for verification. If the violation is confirmed, the sender is blocked.
				</li>
				<li>
					Users are fully responsible for the content of their messages. The Administration is not obligated to notify about chat moderation.
				</li>
			</ol>
		</section>
		<!-- SECTION 5 -->
		<section id="section-5" class="mb-12 scroll-mt-20">
			<h2 class="text-2xl font-bold text-zinc-50 border-l-4 border-purple-500 pl-4 mb-4">5. Music (Pulse)</h2>
			<ol class="list-decimal list-inside space-y-4">
				<li>
					Pulse is a section for uploading and listening to audio tracks and albums. Uploading is available to registered users.
				</li>
				<li>
					The User uploading a track is fully responsible for compliance with copyright. The Administration does not check content before publication.
				</li>
				<li>
					It is prohibited to upload to Pulse:
					<div class="bg-red-900/30 border border-red-800 p-4 rounded-2xl mt-3 mb-3">
						<ul class="list-disc ml-6 space-y-1 text-red-100">
							<li>Tracks that violate copyright (without the copyright holder's permission);</li>
							<li>Audio with pornographic, violent, or extremist content;</li>
							<li>Audio containing direct insults, calls for violence;</li>
							<li>Technically defective or malicious files.</li>
						</ul>
					</div>
				</li>
				<li>
					Allowed:
					<ul class="list-disc ml-6 mt-2 space-y-1">
						<li>Original compositions;</li>
						<li>Covers, remixes, fan versions — only with the copyright holder's permission or within fair use, if permitted by the user's country's legislation.</li>
					</ul>
				</li>
				<li>
					Upon receiving a complaint from a copyright holder (to contact@ancial.ru with the subject [Copyright]), the track is removed within 72 hours, the user is notified. Repeated violations lead to account blocking.
				</li>
			</ol>
		</section>
		<!-- SECTION 6 -->
		<section id="section-6" class="mb-12 scroll-mt-20">
			<h2 class="text-2xl font-bold text-zinc-50 border-l-4 border-purple-500 pl-4 mb-4">6. Videos (ClickPlay/Stream)</h2>
			<ol class="list-decimal list-inside space-y-4">
				<li>
					ClickPlay/Stream is a video aggregator that allows adding links to videos from YouTube, RuTube, VK Video, and other public platforms. Direct file uploading is not provided.
				</li>
				<li>
					A User adding a video confirms that:
					<ul class="list-disc ml-6 mt-2 space-y-1">
						<li>the video is public and allowed to be embedded;</li>
						<li>they do not violate copyright;</li>
						<li>the content does not contain prohibited material.</li>
					</ul>
				</li>
				<li>
					It is prohibited to add videos containing:
					<div class="bg-red-900/30 border border-red-800 p-4 rounded-2xl mt-3 mb-3">
						<ul class="list-disc ml-6 space-y-1 text-red-100">
							<li>Pornography, violence, cruelty;</li>
							<li>Extremism, terrorism, calls for illegal activities;</li>
							<li>Insults, doxxing, defamation;</li>
							<li>Copyright violations (without permission).</li>
						</ul>
					</div>
				</li>
				<li>
					If a video on the original platform (for example, YouTube) is deleted or blocked, it becomes unavailable on Ancial as well.
				</li>
				<li>
					Upon a copyright holder's complaint (to contact@ancial.ru with the subject [Copyright]), the video link is removed within 72 hours. The user is warned. Repeated violations result in blocking.
				</li>
			</ol>
		</section>
		<!-- SECTION 7 -->
		<section id="section-7" class="mb-12 scroll-mt-20">
			<h2 class="text-2xl font-bold text-zinc-50 border-l-4 border-purple-500 pl-4 mb-4">7. Wallet and anci Tokens</h2>
			<ol class="list-decimal list-inside space-y-4">
				<li>
					anci are internal virtual tokens of the platform, linked to the anci cryptocurrency on the TON network. Tokens are not money or a financial instrument, and are intended to encourage activity and interaction within the platform.
				</li>
				<li>
					Obtaining tokens:
					<ul class="list-disc ml-6 mt-2 space-y-1">
						<li>Only through voluntary donations from other users (for example, for a liked post, music, video);</li>
						<li>Not sold for real money;</li>
						<li>Not automatically awarded for registration or activity.</li>
					</ul>
				</li>
				<li>
					Using tokens:
					<ul class="list-disc ml-6 mt-2 space-y-1">
						<li>Transfer to other users;</li>
						<li>Exchange for internal rewards (for example: badges, stickers, premium features — if provided);</li>
						<li>Withdrawal to an external TON wallet (with a verified account and compliance with limits).</li>
					</ul>
				</li>
				<li>
					Token withdrawal:
					<ul class="list-disc ml-6 mt-2 space-y-1">
						<li>Only possible to TON wallets;</li>
						<li>Considered a "reward", not a sale or transfer of funds;</li>
						<li>Not subject to taxes by the platform — the user is independently responsible to their government upon withdrawal.</li>
					</ul>
				</li>
				<li>
					Prohibited:
					<div class="bg-red-900/30 border border-red-800 p-4 rounded-2xl mt-3 mb-3">
						<ul class="list-disc ml-6 space-y-1 text-red-100">
							<li>Using tokens to purchase prohibited content or services;</li>
							<li>Fraud, artificial engagement, spam for the purpose of obtaining tokens;</li>
							<li>Transfers simulating the sale of goods/services (the platform is not a marketplace).</li>
						</ul>
					</div>
				</li>
				<li>
					Upon account blocking, all tokens are forfeited. Upon deletion, they are not returned.
				</li>
				<li>
					The Administration has the right to freeze a wallet in case of suspected fraud, money laundering, spam, or violation of the Terms. To unfreeze, email contact@ancial.ru with the subject [Wallet].
				</li>
			</ol>
		</section>
		<!-- SECTION 8 -->
		<section id="section-8" class="mb-12 scroll-mt-20">
			<h2 class="text-2xl font-bold text-zinc-50 border-l-4 border-purple-500 pl-4 mb-4">8. Copyright and Complaints</h2>
			<ol class="list-decimal list-inside space-y-4">
				<li>
					The User guarantees that the content they upload (posts, music, videos, images) does not violate copyright, related rights, patent rights, or other rights of third parties.
				</li>
				<li>
					Upon discovering a violation, the copyright holder may send a complaint to contact@ancial.ru with the subject [Copyright] and include:
					<ul class="list-disc ml-6 mt-2 space-y-1">
						<li>Their contact information;</li>
						<li>Description of the infringed work;</li>
						<li>Link to the content on Ancial;</li>
						<li>Statement of good faith of the claim;</li>
						<li>Signature (electronic or scanned copy).</li>
					</ul>
				</li>
				<li>
					The Administration undertakes to review the complaint within 72 hours and remove the content upon confirmation of the violation.
				</li>
				<li>
					A User whose content has been removed receives a notification and may send a counter-notice (if they believe the removal was erroneous) to contact@ancial.ru with the subject [Appeal — Copyright].
				</li>
				<li>
					Repeated copyright violations lead to permanent account blocking.
				</li>
			</ol>
		</section>
		<!-- SECTION 9 -->
		<section id="section-9" class="mb-12 scroll-mt-20">
			<h2 class="text-2xl font-bold text-zinc-50 border-l-4 border-purple-500 pl-4 mb-4">9. Prohibited Behavior and Sanctions</h2>
			<ol class="list-decimal list-inside space-y-4">
				<li>
					Prohibited:
					<div class="bg-red-900/30 border border-red-800 p-4 rounded-2xl mt-3 mb-3">
						<ul class="list-disc ml-6 space-y-1 text-red-100">
							<li>Creating accounts to bypass blocks;</li>
							<li>Using bots, scripts, automation without Administration consent;</li>
							<li>Phishing, fraud, collecting user data;</li>
							<li>Selling accounts, tokens, places in communities;</li>
							<li>Impersonating administration or other users (fake accounts);</li>
							<li>Coordinating mass attacks, raids, trolling.</li>
						</ul>
					</div>
				</li>
				<li>
					Sanctions:
					<ul class="list-disc ml-6 mt-2 space-y-1">
						<li>Warning (rare, only in exceptional cases);</li>
						<li>Account blocking (temporary or permanent) — the main measure;</li>
						<li>Content removal;</li>
						<li>Token forfeiture;</li>
						<li>Data transfer to law enforcement agencies — in case of law violation.</li>
					</ul>
				</li>
				<li>
					Blocking is issued immediately without prior warning, except in cases where the Administration deems it possible to request clarifications — email to contact@ancial.ru with the subject [Clarification].
				</li>
			</ol>
		</section>
		<!-- SECTION 10 -->
		<section id="section-10" class="mb-12 scroll-mt-20">
			<h2 class="text-2xl font-bold text-zinc-50 border-l-4 border-purple-500 pl-4 mb-4">10. Privacy and Data</h2>
			<ol class="list-decimal list-inside space-y-4">
				<li>
					The Administration collects and processes:
					<ul class="list-disc ml-6 mt-2 space-y-1">
						<li>Email, phone, username, country of residence;</li>
						<li>IP address during registration and login;</li>
						<li>Behavioral data (views, likes, transitions) — to improve recommendations;</li>
						<li>Files (photos, videos, audio) uploaded by the user;</li>
						<li>Correspondence — only when investigating complaints.</li>
					</ul>
				</li>
				<li>
					Data is not sold to third parties. Used for:
					<ul class="list-disc ml-6 mt-2 space-y-1">
						<li>Platform operation;</li>
						<li>Moderation;</li>
						<li>Mailings (can be disabled);</li>
						<li>Statistics and service improvement.</li>
					</ul>
				</li>
				<li>
					The User has the right to:
					<ul class="list-disc ml-6 mt-2 space-y-1">
						<li>Request a copy of their data (contact@ancial.ru with the subject [My Data]);</li>
						<li>Delete account and data — see paragraph 2.5.</li>
					</ul>
				</li>
				<li>
					The platform uses cookies and similar technologies. By continuing to use the site, the user agrees to this.
				</li>
			</ol>
		</section>
		<!-- SECTION 11 -->
		<section id="section-11" class="mb-12 scroll-mt-20">
			<h2 class="text-2xl font-bold text-zinc-50 border-l-4 border-purple-500 pl-4 mb-4">11. Moderation and Appeals</h2>
			<ol class="list-decimal list-inside space-y-4">
				<li>
					Moderators are Administration employees. In some cases, trained volunteers may be involved under team supervision.
				</li>
				<li>
					Complaints about content are submitted through the "Report" button under the material or to contact@ancial.ru with the subject [Content Complaint].
				</li>
				<li>
					Moderator decisions are final, except in cases where the user can request a review by sending an email to contact@ancial.ru with the subject [Appeal] and attaching evidence.
				</li>
				<li>
					Appeals are reviewed within 5 business days. Refusal to restore an account is a final decision.
				</li>
				<li>
					Moderation statistics are not published regularly but may be disclosed in annual reports.
				</li>
			</ol>
		</section>
		<!-- SECTION 12 -->
		<section id="section-12" class="mb-12 scroll-mt-20">
			<h2 class="text-2xl font-bold text-zinc-50 border-l-4 border-purple-500 pl-4 mb-4">12. Changes to Terms and Legal Aspects</h2>
			<ol class="list-decimal list-inside space-y-4">
				<li>
					The platform is not responsible for:
					<ul class="list-disc ml-6 mt-2 space-y-1">
						<li>Losses caused by the use or inability to use the services;</li>
						<li>Actions of third parties (including users);</li>
						<li>Content of external links and videos (YouTube, etc.).</li>
					</ul>
				</li>
				<li>
					All disputes are resolved in accordance with the laws of the Russian Federation.
				</li>
				<li>
					If any provision of the Terms is deemed invalid, the remaining provisions remain in force.
				</li>
				<li>
					Force majeure: The Administration is not responsible for failures caused by force majeure circumstances (wars, natural disasters, government actions, hacker attacks).
				</li>
				<li>
					Official correspondence with the Administration is conducted only through contact@ancial.ru with mandatory subject indication in the format [SUBJECT]. Emails without a subject may be ignored or processed with a delay.
				</li>
			</ol>
		</section>
		<!-- SECTION 13 -->
		<section id="section-13" class="mb-12 scroll-mt-20">
			<h2 class="text-2xl font-bold text-zinc-50 border-l-4 border-purple-500 pl-4 mb-4">13. Communities and Groups</h2>
			<ol class="list-decimal list-inside space-y-4">
				<li>
					Communities are public or private pages created by users to unite an audience by interests, topics, projects.
				</li>
				<li>
					Community Creator is the user who initiated its creation. Appoints Editors (moderators) at their discretion.
				</li>
				<li>
					Rights of Creator and Editors:
					<ul class="list-disc ml-6 mt-2 space-y-1">
						<li>Publishing posts on behalf of the Community;</li>
						<li>Managing members (inviting, removing, assigning roles);</li>
						<li>Setting privacy (public/private);</li>
						<li>Establishing rules within the Community (additional to these Terms).</li>
					</ul>
				</li>
				<li>
					Prohibited in Communities:
					<div class="bg-red-900/30 border border-red-800 p-4 rounded-2xl mt-3 mb-3">
						<ul class="list-disc ml-6 space-y-1 text-red-100">
							<li>Publishing content prohibited by sections 3, 5, 6;</li>
							<li>Creating Communities with names imitating official bodies, brands, administration without permission;</li>
							<li>Using Communities for spam, fraud, data collection;</li>
							<li>Selling Community management or membership for real money or tokens (unless permitted by Administration).</li>
						</ul>
					</div>
				</li>
				<li>
					Responsibility for content in the Community lies with the Creator and Editors who published the material. In case of violation, the content is removed, and the responsible party is warned or blocked.
				</li>
				<li>
					The Administration has the right to delete a Community without warning in case of gross or repeated violation of the Terms.
				</li>
				<li>
					Users can complain about content or actions of Community moderators through the "Report" button or to contact@ancial.ru with the subject [Community Complaint].
				</li>
				<li>
					The Administration is not obligated to moderate Communities proactively but responds to complaints.
				</li>
			</ol>
		</section>
		<!-- CONCLUSION -->
		<section id="conclusion" class="mb-16 scroll-mt-20 pt-8 border-t border-zinc-800">
			<h2 class="text-3xl font-bold text-zinc-50 mb-6">Conclusion</h2>
			<p class="mb-6">
				These Terms constitute a public offer and take effect from the moment you start using the Ancial Platform.
				<br>
				The full version is always available at:
				<a href="https://ancial.ru/legal" class="text-purple-400 hover:text-purple-300 underline font-medium">https://ancial.ru/legal</a>
			</p>
			<div class="bg-zinc-900 p-6 rounded-2xl border border-purple-800/50">
				<h3 class="text-xl font-semibold text-purple-400 mb-3">❗ IMPORTANT</h3>
				<p>
					When sending any email to <strong>contact@ancial.ru</strong>, always specify the subject in the format <code class="email-tag">[SUBJECT]</code>, for example:
				</p>
				<div class="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
					<code class="email-tag">[Content Complaint]</code>
					<code class="email-tag">[Copyright]</code>
					<code class="email-tag">[Appeal]</code>
					<code class="email-tag">[Account Deletion]</code>
					<code class="email-tag">[My Data]</code>
					<code class="email-tag">[Wallet]</code>
					<code class="email-tag">[Security]</code>
					<code class="email-tag">[Clarification]</code>
					<code class="email-tag">[Community Complaint]</code>
				</div>
				<p class="mt-4 text-sm text-red-400">
					Emails without a subject may be ignored or processed with a delay.
				</p>
			</div>
		</section>
		<!-- FOOTER -->
		<footer class="text-center py-8 text-zinc-500 text-sm border-t border-zinc-800 mt-12">
			<p>© 2025 Ancial. All rights reserved.</p>
			<p class="mt-2">
				Terms version: 1.3 | Published: <a href="https://ancial.ru/legal" class="text-purple-400 hover:underline">ancial.ru/legal</a>
			</p>
		</footer>
	</div>
</div>
<div class="bg-zinc-900 text-zinc-100 rounded-2xl p-3" style="display: none;max-width:1000px;" id="cookie">
	<div class="flex">
		<span class="font-medium text-left text-zinc-200 text-lg flex-grow">Политика использования файлов Cookie</span>
		<svg data-fancybox-close class="inline duration-300  cursor-pointer w-5 h-5 fill-white inline" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
			<path d="M 39.486328 6.9785156 A 1.50015 1.50015 0 0 0 38.439453 7.4394531 L 24 21.878906 L 9.5605469 7.4394531 A 1.50015 1.50015 0 0 0 8.484375 6.984375 A 1.50015 1.50015 0 0 0 7.4394531 9.5605469 L 21.878906 24 L 7.4394531 38.439453 A 1.50015 1.50015 0 1 0 9.5605469 40.560547 L 24 26.121094 L 38.439453 40.560547 A 1.50015 1.50015 0 1 0 40.560547 38.439453 L 26.121094 24 L 40.560547 9.5605469 A 1.50015 1.50015 0 0 0 39.486328 6.9785156 z"></path>
		</svg>
	</div>
	<div>
		Дата последнего обновления:&nbsp;25.03.2026<br />
		<br />
		Продолжая использовать данный веб-сайт без изменения настроек браузера, вы выражаете согласие на использование cookie-файлов в соответствии с настоящей Политикой. Если вы не согласны с использованием файлов cookie, пожалуйста, измените настройки своего браузера или прекратите использование сайта.<br />
		<br />
		<strong>1. Что такое cookie</strong><br />
		Cookie - это небольшие текстовые файлы, которые сохраняются на вашем устройстве при посещении сайта. Они позволяют распознавать вас при повторных визитах, сохранять настройки и обеспечивать работу определённых функций сайта.<br />
		<br />
		Типы cookie-файлов:</p>

		<ul class="list-disc">
			<li>Сеансовые - удаляются после закрытия браузера</li>
			<li>Постоянные - хранятся на устройстве до установленного срока истечения</li>
			<li>Сторонние - устанавливаются внешними сервисами и платформами</li>
		</ul>

		<p>Мы не используем cookie для хранения персональных данных без вашего согласия.<br />
		<br />
		<strong>2. Цели использования файлов cookie</strong><br />
		Мы используем cookie-файлы и аналогичные технологии для следующих целей:<br />
		<br>
		Обязательные (критически важные). Необходимы для корректной работы сайта:</p>

		<ul class="list-disc">
			<li>Хранение содержимого корзины</li>
			<li>Поддержка сессии и авторизации</li>
			<li>Сохранение данных, введённых в формах, в течение одного сеанса</li>
		</ul>
		<br>
		<p>Функциональные. Улучшают пользовательский опыт:</p>

		<ul class="list-disc">
			<li>Запоминают выбранный язык, регион, другие настройки</li>
			<li>Хранят информацию об уже предложенных функциях (например, онлайн-чат)</li>
		</ul>
		<br>
		<p>Аналитические. Используются для сбора статистических данных и оптимизации сайта:</p>

		<ul class="list-disc">
			<li>Google Analytics, Яндекс.Метрика, Appsflyer и др.</li>
			<li>Анализ пользовательских действий</li>
			<li>Подсчёт ошибок, улучшение производительности сайта и интерфейса</li>
		</ul>
		<br>				
		<p>Рекламные и ссылочные<br />
		Позволяют оценивать эффективность рекламных кампаний и переходов с внешних источников (например, с сайтов партнёров или баннеров).<br />
		<br />
		<strong>3. Сторонние cookie</strong><br />
		Некоторые cookie-файлы могут быть установлены сторонними сервисами (например, Google, Яндекс, VK, YouTube). Мы не управляем их использованием и не контролируем содержание таких cookie. Мы рекомендуем ознакомиться с политиками конфиденциальности этих сервисов для получения дополнительной информации.<br />
		<br />
		Вы можете отказаться от использования сторонних cookie, изменив настройки в вашем браузере или воспользовавшись инструментами настройки на сайтах соответствующих сервисов.<br />
		<br />
		<strong>4. Управление cookie</strong><br />
		Вы можете настроить браузер для блокировки или удаления cookie-файлов. Обратите внимание, что отключение cookie может повлиять на корректную работу некоторых функций сайта.<br />
		<br />
		Если вы используете несколько устройств (например, смартфон и компьютер), настройки необходимо изменять отдельно для каждого устройства и браузера.<br />
		<br />
		<strong>5. Веб-маяки и подобные технологии</strong><br />
		На сайте и в электронных рассылках мы можем использовать веб-маяки (однопиксельные изображения), которые позволяют отслеживать взаимодействие с контентом. Они работают совместно с cookie и могут быть отключены при деактивации cookie или при блокировке загрузки изображений в настройках почтовой программы или браузера.<br />
		<br />
		<strong>6. Обновление политики</strong><br />
		Актуальная версия настоящей Политики использования файлов cookie размещена в сети Интернет по адресу:<a href="https://ancial.ru/legal/" target="_blank" class="text-blue-500 hover:underline">https://ancial.ru/legal/</a>. Мы оставляем за собой право вносить в неё изменения в любое время без предварительного уведомления. Обновлённая редакция вступает в силу с момента её публикации по указанному адресу.</p>
	</div>
</div>
<div class="bg-zinc-900 text-zinc-100 rounded-2xl p-3" style="display: none;max-width:1000px;" id="bezopasnost">
	<div class="flex">
		<span class="font-medium text-left text-zinc-200 text-lg flex-grow">Политика обработки персональных данных</span>
		<svg data-fancybox-close class="inline duration-300  cursor-pointer w-5 h-5 fill-white inline" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
			<path d="M 39.486328 6.9785156 A 1.50015 1.50015 0 0 0 38.439453 7.4394531 L 24 21.878906 L 9.5605469 7.4394531 A 1.50015 1.50015 0 0 0 8.484375 6.984375 A 1.50015 1.50015 0 0 0 7.4394531 9.5605469 L 21.878906 24 L 7.4394531 38.439453 A 1.50015 1.50015 0 1 0 9.5605469 40.560547 L 24 26.121094 L 38.439453 40.560547 A 1.50015 1.50015 0 1 0 40.560547 38.439453 L 26.121094 24 L 40.560547 9.5605469 A 1.50015 1.50015 0 0 0 39.486328 6.9785156 z"></path>
		</svg>
	</div>
	<div>
		<h5>1. Общие положения</h5>
		<br />
		<p>
			Настоящая политика обработки персональных данных составлена в соответствии с требованиями Федерального закона от 27.07.2006. №152-ФЗ &laquo;О персональных данных&raquo; (далее - Закон о персональных данных) и определяет порядок
			обработки персональных данных и меры по обеспечению безопасности персональных данных, предпринимаемые&nbsp;Ctrl C + Ctrl V&nbsp;(далее &ndash; Оператор).
		</p>
		<br />
		<p>
			1.1. Оператор ставит своей важнейшей целью и условием осуществления своей деятельности соблюдение прав и свобод человека и гражданина при обработке его персональных данных, в том числе защиты прав на неприкосновенность частной
			жизни, личную и семейную тайну.
		</p>
		<br />
		<p>1.2. Настоящая политика Оператора в отношении обработки персональных данных (далее &ndash; Политика) применяется ко всей информации, которую Оператор может получить о посетителях веб-сайта&nbsp;<span class="text-purple-500">https://<?php echo $domain; ?></span>.</p>
		<br />
		<h5>2. Основные понятия, используемые в Политике</h5>
		<br />
		<p>2.1. Автоматизированная обработка персональных данных &ndash; обработка персональных данных с помощью средств вычислительной техники.</p>
		<br />
		<p>2.2. Блокирование персональных данных &ndash; временное прекращение обработки персональных данных (за исключением случаев, если обработка необходима для уточнения персональных данных).</p>
		<br />
		<p>2.3. Веб-сайт &ndash; совокупность графических и информационных материалов, а также программ для ЭВМ и баз данных, обеспечивающих их доступность в сети интернет по сетевому адресу&nbsp;<span class="text-purple-500">https://<?php echo $domain; ?></span>.</p>
		<br />
		<p>2.4. Информационная система персональных данных &mdash; совокупность содержащихся в базах данных персональных данных, и обеспечивающих их обработку информационных технологий и технических средств.</p>
		<br />
		<p>
			2.5. Обезличивание персональных данных &mdash; действия, в результате которых невозможно определить без использования дополнительной информации принадлежность персональных данных конкретному Пользователю или иному субъекту
			персональных данных.
		</p>
		<br />
		<p>
			2.6. Обработка персональных данных &ndash; любое действие (операция) или совокупность действий (операций), совершаемых с использованием средств автоматизации или без использования таких средств с персональными данными, включая
			сбор, запись, систематизацию, накопление, хранение, уточнение (обновление, изменение), извлечение, использование, передачу (распространение, предоставление, доступ), обезличивание, блокирование, удаление, уничтожение
			персональных данных.
		</p>
		<br />
		<p>
			2.7. Оператор &ndash; государственный орган, муниципальный орган, юридическое или физическое лицо, самостоятельно или совместно с другими лицами организующие и (или) осуществляющие обработку персональных данных, а также
			определяющие цели обработки персональных данных, состав персональных данных, подлежащих обработке, действия (операции), совершаемые с персональными данными.
		</p>
		<br />
		<p>2.8. Персональные данные &ndash; любая информация, относящаяся прямо или косвенно к определенному или определяемому Пользователю веб-сайта&nbsp;<span class="text-purple-500">https://<?php echo $domain; ?></span>.</p>
		<br />
		<p>
			2.9. Персональные данные, разрешенные субъектом персональных данных для распространения, - персональные данные, доступ неограниченного круга лиц к которым предоставлен субъектом персональных данных путем дачи согласия на
			обработку персональных данных, разрешенных субъектом персональных данных для распространения в порядке, предусмотренном Законом о персональных данных (далее - персональные данные, разрешенные для распространения).
		</p>
		<br />
		<p>2.10. Пользователь &ndash; любой посетитель веб-сайта&nbsp;<span class="text-purple-500">https://<?php echo $domain; ?></span>.</p>
		<br />
		<p>2.11. Предоставление персональных данных &ndash; действия, направленные на раскрытие персональных данных определенному лицу или определенному кругу лиц.</p>
		<br />
		<p>
			2.12. Распространение персональных данных &ndash; любые действия, направленные на раскрытие персональных данных неопределенному кругу лиц (передача персональных данных) или на ознакомление с персональными данными неограниченного
			круга лиц, в том числе обнародование персональных данных в средствах массовой информации, размещение в информационно-телекоммуникационных сетях или предоставление доступа к персональным данным каким-либо иным способом.
		</p>
		<br />
		<p>
			2.13. Трансграничная передача персональных данных &ndash; передача персональных данных на территорию иностранного государства органу власти иностранного государства, иностранному физическому или иностранному юридическому лицу.
		</p>
		<br />
		<p>
			2.14. Уничтожение персональных данных &ndash; любые действия, в результате которых персональные данные уничтожаются безвозвратно с невозможностью дальнейшего восстановления содержания персональных данных в информационной системе
			персональных данных и (или) уничтожаются материальные носители персональных данных.
		</p>
		<br />
		<h5>3. Основные права и обязанности Оператора</h5>
		<br />
		<p>3.1. Оператор имеет право:</p>
		<br />
		<p>&ndash; получать от субъекта персональных данных достоверные информацию и/или документы, содержащие персональные данные;</p>
		<p>
			&ndash; в случае отзыва субъектом персональных данных согласия на обработку персональных данных Оператор вправе продолжить обработку персональных данных без согласия субъекта персональных данных при наличии оснований, указанных
			в Законе о персональных данных;
		</p>
		<p>
			&ndash; самостоятельно определять состав и перечень мер, необходимых и достаточных для обеспечения выполнения обязанностей, предусмотренных Законом о персональных данных и принятыми в соответствии с ним нормативными правовыми
			актами, если иное не предусмотрено Законом о персональных данных или другими федеральными законами.
		</p>
		<br />
		<p>3.2. Оператор обязан:</p>
		<br />
		<p>&ndash; предоставлять субъекту персональных данных по его просьбе информацию, касающуюся обработки его персональных данных;</p>
		<p>&ndash; организовывать обработку персональных данных в порядке, установленном действующим законодательством РФ;</p>
		<p>&ndash; отвечать на обращения и запросы субъектов персональных данных и их законных представителей в соответствии с требованиями Закона о персональных данных;</p>
		<p>&ndash; сообщать в уполномоченный орган по защите прав субъектов персональных данных по запросу этого органа необходимую информацию в течение 30 дней с даты получения такого запроса;</p>
		<p>&ndash; публиковать или иным образом обеспечивать неограниченный доступ к настоящей Политике в отношении обработки персональных данных;</p>
		<p>
			&ndash; принимать правовые, организационные и технические меры для защиты персональных данных от неправомерного или случайного доступа к ним, уничтожения, изменения, блокирования, копирования, предоставления, распространения
			персональных данных, а также от иных неправомерных действий в отношении персональных данных;
		</p>
		<p>&ndash; прекратить передачу (распространение, предоставление, доступ) персональных данных, прекратить обработку и уничтожить персональные данные в порядке и случаях, предусмотренных Законом о персональных данных;</p>
		<p>&ndash; исполнять иные обязанности, предусмотренные Законом о персональных данных.</p>
		<br />
		<h5>4. Основные права и обязанности субъектов персональных данных</h5>
		<br />
		<p>4.1. Субъекты персональных данных имеют право:</p>
		<br />
		<p>
			&ndash; получать информацию, касающуюся обработки его персональных данных, за исключением случаев, предусмотренных федеральными законами. Сведения предоставляются субъекту персональных данных Оператором в доступной форме, и в
			них не должны содержаться персональные данные, относящиеся к другим субъектам персональных данных, за исключением случаев, когда имеются законные основания для раскрытия таких персональных данных. Перечень информации и порядок
			ее получения установлен Законом о персональных данных;
		</p>
		<p>
			&ndash; требовать от оператора уточнения его персональных данных, их блокирования или уничтожения в случае, если персональные данные являются неполными, устаревшими, неточными, незаконно полученными или не являются необходимыми
			для заявленной цели обработки, а также принимать предусмотренные законом меры по защите своих прав;
		</p>
		<p>&ndash; выдвигать условие предварительного согласия при обработке персональных данных в целях продвижения на рынке товаров, работ и услуг;</p>
		<p>&ndash; на отзыв согласия на обработку персональных данных;</p>
		<p>&ndash; обжаловать в уполномоченный орган по защите прав субъектов персональных данных или в судебном порядке неправомерные действия или бездействие Оператора при обработке его персональных данных;</p>
		<p>&ndash; на осуществление иных прав, предусмотренных законодательством РФ.</p>
		<br />
		<p>4.2. Субъекты персональных данных обязаны:</p>
		<br />
		<p>&ndash; предоставлять Оператору достоверные данные о себе;</p>
		<p>&ndash; сообщать Оператору об уточнении (обновлении, изменении) своих персональных данных.</p>
		<br />
		<p>4.3. Лица, передавшие Оператору недостоверные сведения о себе, либо сведения о другом субъекте персональных данных без согласия последнего, несут ответственность в соответствии с законодательством РФ.</p>
		<br />
		<h5>5. Оператор может обрабатывать следующие персональные данные Пользователя</h5>
		<br />
		<p>5.1.&nbsp;Фамилия, имя, отчество.</p>
		<br />
		<p>5.2.&nbsp;Электронный адрес.</p>
		<br />
		<p>5.3.&nbsp;Номера телефонов.</p>
		<br />
		<p>5.4.&nbsp;Год, месяц, дата и место рождения.</p>
		<br />
		<p>5.5.&nbsp;Фотографии.</p>
		<br />
		<p>5.6. Также на сайте происходит сбор и обработка обезличенных данных о посетителях (в т.ч. файлов &laquo;cookie&raquo;) с помощью сервисов интернет-статистики (Яндекс Метрика и Гугл Аналитика и других).</p>
		<br />
		<p>5.7. Вышеперечисленные данные далее по тексту Политики объединены общим понятием Персональные данные.</p>
		<br />
		<p>5.8. Обработка специальных категорий персональных данных, касающихся расовой, национальной принадлежности, политических взглядов, религиозных или философских убеждений, интимной жизни, Оператором не осуществляется.</p>
		<br />
		<p>
			5.9. Обработка персональных данных, разрешенных для распространения, из числа специальных категорий персональных данных, указанных в ч. 1 ст. 10 Закона о персональных данных, допускается, если соблюдаются запреты и условия,
			предусмотренные ст. 10.1 Закона о персональных данных.
		</p>
		<br />
		<p>
			5.10. Согласие Пользователя на обработку персональных данных, разрешенных для распространения, оформляется отдельно от других согласий на обработку его персональных данных. При этом соблюдаются условия, предусмотренные, в
			частности, ст. 10.1 Закона о персональных данных. Требования к содержанию такого согласия устанавливаются уполномоченным органом по защите прав субъектов персональных данных.
		</p>
		<br />
		<p>5.10.1 Согласие на обработку персональных данных, разрешенных для распространения, Пользователь предоставляет Оператору непосредственно.</p>
		<br />
		<p>
			5.10.2 Оператор обязан в срок не позднее трех рабочих дней с момента получения указанного согласия Пользователя опубликовать информацию об условиях обработки, о наличии запретов и условий на обработку неограниченным кругом лиц
			персональных данных, разрешенных для распространения.
		</p>
		<br />
		<p>
			5.10.3 Передача (распространение, предоставление, доступ) персональных данных, разрешенных субъектом персональных данных для распространения, должна быть прекращена в любое время по требованию субъекта персональных данных.
			Данное требование должно включать в себя фамилию, имя, отчество (при наличии), контактную информацию (номер телефона, адрес электронной почты или почтовый адрес) субъекта персональных данных, а также перечень персональных
			данных, обработка которых подлежит прекращению. Указанные в данном требовании персональные данные могут обрабатываться только Оператором, которому оно направлено.
		</p>
		<br />
		<p>
			5.10.4 Согласие на обработку персональных данных, разрешенных для распространения, прекращает свое действие с момента поступления Оператору требования, указанного в п. 5.10.3 настоящей Политики в отношении обработки персональных
			данных.
		</p>
		<br />
		<h5>6. Принципы обработки персональных данных</h5>
		<br />
		<p>6.1. Обработка персональных данных осуществляется на законной и справедливой основе.</p>
		<br />
		<p>6.2. Обработка персональных данных ограничивается достижением конкретных, заранее определенных и законных целей. Не допускается обработка персональных данных, несовместимая с целями сбора персональных данных.</p>
		<br />
		<p>6.3. Не допускается объединение баз данных, содержащих персональные данные, обработка которых осуществляется в целях, несовместимых между собой.</p>
		<br />
		<p>6.4. Обработке подлежат только персональные данные, которые отвечают целям их обработки.</p>
		<br />
		<p>6.5. Содержание и объем обрабатываемых персональных данных соответствуют заявленным целям обработки. Не допускается избыточность обрабатываемых персональных данных по отношению к заявленным целям их обработки.</p>
		<br />
		<p>
			6.6. При обработке персональных данных обеспечивается точность персональных данных, их достаточность, а в необходимых случаях и актуальность по отношению к целям обработки персональных данных. Оператор принимает необходимые меры
			и/или обеспечивает их принятие по удалению или уточнению неполных или неточных данных.
		</p>
		<br />
		<p>
			6.7. Хранение персональных данных осуществляется в форме, позволяющей определить субъекта персональных данных, не дольше, чем этого требуют цели обработки персональных данных, если срок хранения персональных данных не установлен
			федеральным законом, договором, стороной которого, выгодоприобретателем или поручителем по которому является субъект персональных данных. Обрабатываемые персональные данные уничтожаются либо обезличиваются по достижении целей
			обработки или в случае утраты необходимости в достижении этих целей, если иное не предусмотрено федеральным законом.
		</p>
		<br />
		<h5>7. Цели обработки персональных данных</h5>
		<br />
		<p>7.1. Цель обработки персональных данных Пользователя:</p>
		<br />
		<p>&ndash;&nbsp;информирование Пользователя посредством отправки электронных писем;</p>
		<p>&ndash;&nbsp;предоставление доступа Пользователю к сервисам, информации и/или материалам, содержащимся на веб-сайте <span class="text-purple-500">https://<?php echo $domain; ?></span>.</p>
		<br />
		<p>
			7.2. Также Оператор имеет право направлять Пользователю уведомления о новых продуктах и услугах, специальных предложениях и различных событиях. Пользователь всегда может отказаться от получения информационных сообщений, направив
			Оператору письмо на адрес электронной почты&nbsp;contact@<?php echo $domain; ?>&nbsp;с пометкой &laquo;Отказ от уведомлений о новых продуктах и услугах и специальных предложениях&raquo;.
		</p>
		<br />
		<p>7.3. Обезличенные данные Пользователей, собираемые с помощью сервисов интернет-статистики, служат для сбора информации о действиях Пользователей на сайте, улучшения качества сайта и его содержания.</p>
		<br />
		<h5>8. Правовые основания обработки персональных данных</h5>
		<br />
		<p>8.1. Правовыми основаниями обработки персональных данных Оператором являются:</p>
		<br />
		<p>&ndash;&nbsp;уставные (учредительные) документы Оператора;</p>
		<p>&ndash;&nbsp;договоры, заключаемые между оператором и субъектом персональных данных;</p>
		<p>&ndash; федеральные законы, иные нормативно-правовые акты в сфере защиты персональных данных;</p>
		<p>&ndash; согласия Пользователей на обработку их персональных данных, на обработку персональных данных, разрешенных для распространения.</p>
		<br />
		<p>
			8.2. Оператор обрабатывает персональные данные Пользователя только в случае их заполнения и/или отправки Пользователем самостоятельно через специальные формы, расположенные на сайте&nbsp;<span class="text-purple-500">https://<?php echo $domain; ?></span>&nbsp;или
			направленные Оператору посредством электронной почты. Заполняя соответствующие формы и/или отправляя свои персональные данные Оператору, Пользователь выражает свое согласие с данной Политикой.
		</p>
		<br />
		<p>8.3. Оператор обрабатывает обезличенные данные о Пользователе в случае, если это разрешено в настройках браузера Пользователя (включено сохранение файлов &laquo;cookie&raquo; и использование технологии JavaScript).</p>
		<br />
		<p>8.4. Субъект персональных данных самостоятельно принимает решение о предоставлении его персональных данных и дает согласие свободно, своей волей и в своем интересе.</p>
		<br />
		<h5>9. Условия обработки персональных данных</h5>
		<br />
		<p>9.1. Обработка персональных данных осуществляется с согласия субъекта персональных данных на обработку его персональных данных.</p>
		<br />
		<p>
			9.2. Обработка персональных данных необходима для достижения целей, предусмотренных международным договором Российской Федерации или законом, для осуществления возложенных законодательством Российской Федерации на оператора
			функций, полномочий и обязанностей.
		</p>
		<br />
		<p>
			9.3. Обработка персональных данных необходима для осуществления правосудия, исполнения судебного акта, акта другого органа или должностного лица, подлежащих исполнению в соответствии с законодательством Российской Федерации об
			исполнительном производстве.
		</p>
		<br />
		<p>
			9.4. Обработка персональных данных необходима для исполнения договора, стороной которого либо выгодоприобретателем или поручителем по которому является субъект персональных данных, а также для заключения договора по инициативе
			субъекта персональных данных или договора, по которому субъект персональных данных будет являться выгодоприобретателем или поручителем.
		</p>
		<br />
		<p>
			9.5. Обработка персональных данных необходима для осуществления прав и законных интересов оператора или третьих лиц либо для достижения общественно значимых целей при условии, что при этом не нарушаются права и свободы субъекта
			персональных данных.
		</p>
		<br />
		<p>9.6. Осуществляется обработка персональных данных, доступ неограниченного круга лиц к которым предоставлен субъектом персональных данных либо по его просьбе (далее &ndash; общедоступные персональные данные).</p>
		<br />
		<p>9.7. Осуществляется обработка персональных данных, подлежащих опубликованию или обязательному раскрытию в соответствии с федеральным законом.</p>
		<br />
		<h5>10. Порядок сбора, хранения, передачи и других видов обработки персональных данных</h5>
		<br />
		<p>
			Безопасность персональных данных, которые обрабатываются Оператором, обеспечивается путем реализации правовых, организационных и технических мер, необходимых для выполнения в полном объеме требований действующего
			законодательства в области защиты персональных данных.
		</p>
		<br />
		<p>10.1. Оператор обеспечивает сохранность персональных данных и принимает все возможные меры, исключающие доступ к персональным данным неуполномоченных лиц.</p>
		<br />
		<p>
			10.2. Персональные данные Пользователя никогда, ни при каких условиях не будут переданы третьим лицам, за исключением случаев, связанных с исполнением действующего законодательства либо в случае, если субъектом персональных
			данных дано согласие Оператору на передачу данных третьему лицу для исполнения обязательств по гражданско-правовому договору.
		</p>
		<br />
		<p>
			10.3. В случае выявления неточностей в персональных данных, Пользователь может актуализировать их самостоятельно, путем направления Оператору уведомление на адрес электронной почты Оператора&nbsp;<span class="text-purple-500">contact@<?php echo $domain; ?></span>&nbsp;с
			пометкой &laquo;Актуализация персональных данных&raquo;.
		</p>
		<br />
		<p>
			10.4. Срок обработки персональных данных определяется достижением целей, для которых были собраны персональные данные, если иной срок не предусмотрен договором или действующим законодательством.<br />
			Пользователь может в любой момент отозвать свое согласие на обработку персональных данных, направив Оператору уведомление посредством электронной почты на электронный адрес Оператора&nbsp;<span class="text-purple-500">contact@<?php echo $domain; ?></span>&nbsp;с
			пометкой &laquo;Отзыв согласия на обработку персональных данных&raquo;.
		</p>
		<br />
		<p>
			10.5. Вся информация, которая собирается сторонними сервисами, в том числе платежными системами, средствами связи и другими поставщиками услуг, хранится и обрабатывается указанными лицами (Операторами) в соответствии с их
			Пользовательским соглашением и Политикой конфиденциальности. Субъект персональных данных и/или Пользователь обязан самостоятельно своевременно ознакомиться с указанными документами. Оператор не несет ответственность за действия
			третьих лиц, в том числе указанных в настоящем пункте поставщиков услуг.
		</p>
		<br />
		<p>
			10.6. Установленные субъектом персональных данных запреты на передачу (кроме предоставления доступа), а также на обработку или условия обработки (кроме получения доступа) персональных данных, разрешенных для распространения, не
			действуют в случаях обработки персональных данных в государственных, общественных и иных публичных интересах, определенных законодательством РФ.
		</p>
		<br />
		<p>10.7. Оператор при обработке персональных данных обеспечивает конфиденциальность персональных данных.</p>
		<br />
		<p>
			10.8. Оператор осуществляет хранение персональных данных в форме, позволяющей определить субъекта персональных данных, не дольше, чем этого требуют цели обработки персональных данных, если срок хранения персональных данных не
			установлен федеральным законом, договором, стороной которого, выгодоприобретателем или поручителем по которому является субъект персональных данных.
		</p>
		<br />
		<p>
			10.9. Условием прекращения обработки персональных данных может являться достижение целей обработки персональных данных, истечение срока действия согласия субъекта персональных данных или отзыв согласия субъектом персональных
			данных, а также выявление неправомерной обработки персональных данных.
		</p>
		<br />
		<h5>11. Перечень действий, производимых Оператором с полученными персональными данными</h5>
		<br />
		<p>
			11.1. Оператор осуществляет сбор, запись, систематизацию, накопление, хранение, уточнение (обновление, изменение), извлечение, использование, передачу (распространение, предоставление, доступ), обезличивание, блокирование,
			удаление и уничтожение персональных данных.
		</p>
		<br />
		<p>11.2. Оператор осуществляет автоматизированную обработку персональных данных с получением и/или передачей полученной информации по информационно-телекоммуникационным сетям или без таковой.</p>
		<br />
		<h5>12. Трансграничная передача персональных данных</h5>
		<br />
		<p>
			12.1. Оператор до начала осуществления трансграничной передачи персональных данных обязан убедиться в том, что иностранным государством, на территорию которого предполагается осуществлять передачу персональных данных,
			обеспечивается надежная защита прав субъектов персональных данных.
		</p>
		<br />
		<p>
			12.2. Трансграничная передача персональных данных на территории иностранных государств, не отвечающих вышеуказанным требованиям, может осуществляться только в случае наличия согласия в письменной форме субъекта персональных
			данных на трансграничную передачу его персональных данных и/или исполнения договора, стороной которого является субъект персональных данных.
		</p>
		<br />
		<h5>13. Конфиденциальность персональных данных</h5>
		<br />
		<p>
			Оператор и иные лица, получившие доступ к персональным данным, обязаны не раскрывать третьим лицам и не распространять персональные данные без согласия субъекта персональных данных, если иное не предусмотрено федеральным
			законом.
		</p>
		<br />
		<h5>14. Заключительные положения</h5>
		<br />
		<p>14.1. Пользователь может получить любые разъяснения по интересующим вопросам, касающимся обработки его персональных данных, обратившись к Оператору с помощью электронной почты&nbsp;<span class="text-purple-500">contact@<?php echo $domain; ?></span>.</p>
		<br />
		<p>14.2. В данном документе будут отражены любые изменения политики обработки персональных данных Оператором. Политика действует бессрочно до замены ее новой версией.</p>
		<br />
		<p>14.3. Актуальная версия Политики в свободном доступе расположена в сети Интернет по адресу&nbsp;<span class="text-purple-500">https://<?php echo $domain; ?>/legal</span>.</p>
	</div>
</div>
  );
}
