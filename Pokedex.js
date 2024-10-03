const button=document.getElementById("button")

function firstCharFixer(text){
    const firstChar=text.charAt(0).toUpperCase();
        let name=firstChar;
        for(let i=1;i<text.length;i++){
            name=name+""+text.charAt(i);
        }
    return name;
}
document.getElementById("body").hidden=true;
document.getElementById("search").style.boxShadow="5px 5px 5px black"
button.style.boxShadow="2px 2px 2px black"
async function fetchData(){
    try{
        document.getElementById("body").hidden=false;
        const search=document.getElementById("search").value.toLowerCase();
        const response=await fetch(`https://pokeapi.co/api/v2/pokemon/${search}`);
        if(!response.ok){
            throw new Error("Pokemon not found!!");
        }

        const pokeData=await response.json();
        document.getElementById("name").textContent=firstCharFixer(pokeData.name);
        let id=pokeData.id;
        document.getElementById("id").textContent="ID No. :"+id;

        const img=pokeData.sprites.front_default;
        document.getElementById("sprite").src=img;


        document.getElementById("ability").textContent="Abilty: "+firstCharFixer(pokeData.abilities[0].ability.name);
        try{
            document.getElementById("abilityHidden").textContent="Hidden Ability: "+firstCharFixer(pokeData.abilities[1].ability.name);
        }
        catch(error){
            document.getElementById("abilityHidden").textContent="";
        }

        document.getElementById("type1").textContent=firstCharFixer(pokeData.types[0].type.name);
        document.getElementById("type1").disabled=true;
        document.getElementById("type1").classList=pokeData.types[0].type.name;
        try{
            document.getElementById("type2").hidden=false;
            document.getElementById("type2").disabled=true;
            document.getElementById("type2").textContent=firstCharFixer(pokeData.types[1].type.name);
            document.getElementById("type2").classList=pokeData.types[1].type.name;
        }
        catch(error){
            document.getElementById("type2").hidden=true;
        }

        async function pokeDexEntry(){
            try{
                const response2=await fetch(`https://pokeapi.co/api/v2/pokemon-species/${id}/`);
                const fact=await response2.json();
                document.getElementById("fact").textContent=fact.flavor_text_entries[0].flavor_text;
            }
            catch(error){
                console.error("error");
            }
        }
        pokeDexEntry();
    }
    catch(error){
        document.getElementById("body").hidden=true;
        console.error(error);
    }
} 
