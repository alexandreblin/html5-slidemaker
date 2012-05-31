$(document).ready(function(){
	
	var synchro = true;

	if(parent !== window){

		initNow = function(obj){
			now = obj;
		}

		parent.$(parent.document).trigger('initNow', [initNow]);

	}else{
		$('#link_edit').removeClass('hidden');
		$('#link_synchro').removeClass('hidden');
	}

	now.ready(function() {
		now.goTo = function(slide, event){

			if(event == 'swiperight'){
				prevSlide();
			}else if(event == 'swipeleft'){
				nextSlide();
			}else{
				gotoSlide(slide);
			}
		}

		$('#link_edit').click(function(){
			$('#link_edit').attr('href', '/' + slideShow + '/' + slideShowVersion + '#slide' + (parseInt(curSlide) +1));
		});

		$('#link_synchro').click(function(){
			if(synchro){
				now.unsychronize(now.room);
				$('#link_synchro').text('Sychronize');
				synchro = false;
			}else{
				now.sychronize(now.room, function(slide){
					gotoSlide(slide);
				});
				$('#link_synchro').text('Unsychronize');
				synchro = true;
			}

		});

	});
});